import * as path from 'path';
import * as fs from 'fs';
import { CapabilityRegistry } from './CapabilityRegistry';
import { TestExecutor } from './TestExecutor';
import { ScenarioParser } from './ScenarioParser';
import { BaseAdapter } from '../adapters/BaseAdapter';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { AnthropicAdapter } from '../adapters/AnthropicAdapter';
import { OpenAIAdapter } from '../adapters/OpenAIAdapter';
import { OllamaAdapter } from '../adapters/OllamaAdapter';
import { CraftacoderAdapter } from '../adapters/CraftacoderAdapter';
import { TestResult } from '../types/results';

/**
 * LLM adapter type options
 */
export type LLMAdapterType = 'craftacoder' | 'anthropic' | 'openai' | 'ollama' | 'custom';

/**
 * Base configuration for TestRunner
 */
export interface TestRunnerConfig {
  /**
   * LLM adapter type to use
   * @default 'craftacoder'
   */
  llmAdapter?: LLMAdapterType;
  
  /**
   * LLM adapter configuration
   * The shape depends on the adapter type
   */
  llmAdapterConfig?: Record<string, any>;
  
  /**
   * Custom LLM adapter instance (if type is 'custom')
   */
  customLLMAdapter?: LLMAdapter;
  
  /**
   * Additional adapters to register
   */
  adapters?: Record<string, BaseAdapter>;
  
  /**
   * Addons to register
   * The addons should be instances of classes that have a registerCapabilities method
   */
  addons?: Array<{ registerCapabilities: (registry: CapabilityRegistry) => void }>;
  
  /**
   * Whether to enable caching
   * @default true
   */
  caching?: boolean;
  
  /**
   * Path to the cache file
   * If not provided, a default path will be used
   */
  cachePath?: string;
  
  /**
   * Timeout for test execution in milliseconds
   * @default 60000 (1 minute)
   */
  timeout?: number;
  
  /**
   * Whether to print verbose output
   * @default false
   */
  verbose?: boolean;
}

/**
 * A test file descriptor for batch operations
 */
export interface TestFile {
  /**
   * Path to the test file
   */
  path: string;
  
  /**
   * Content of the test file (if available)
   */
  content?: string;
  
  /**
   * Test metadata (if available)
   */
  metadata?: Record<string, any>;
}

/**
 * Test runner for executing test scenarios
 */
export class TestRunner {
  private registry: CapabilityRegistry;
  private executor: TestExecutor;
  private parser: ScenarioParser;
  private llmAdapter: LLMAdapter;
  private config: TestRunnerConfig;
  
  /**
   * Create a new test runner
   * @param config Test runner configuration
   */
  constructor(config: TestRunnerConfig = {}) {
    this.config = {
      caching: true,
      timeout: 60000,
      verbose: false,
      llmAdapter: 'craftacoder',
      ...config
    };
    
    this.registry = new CapabilityRegistry({
      cachingEnabled: this.config.caching,
      cacheFilePath: this.config.cachePath || path.join(process.cwd(), '.craft-a-tester', 'test-cache.json')
    });
    
    this.llmAdapter = this.createLLMAdapter();
    this.registry.setLLMAdapter(this.llmAdapter);
    
    // Create the scenario parser
    this.parser = new ScenarioParser();
    
    // Register the LLM adapter
    this.registry.registerAdapter('llm', this.llmAdapter);
    
    // Register additional adapters
    if (this.config.adapters) {
      Object.entries(this.config.adapters).forEach(([name, adapter]) => {
        this.registry.registerAdapter(name, adapter);
      });
    }
    
    // Register addons
    if (this.config.addons) {
      this.config.addons.forEach(addon => {
        addon.registerCapabilities(this.registry);
      });
    }
    
    this.executor = new TestExecutor({}, this.registry);
    
    // Make sure we register the adapters with the executor as well
    this.executor.registerAdapter('llm', this.llmAdapter);
    
    if (this.config.adapters) {
      Object.entries(this.config.adapters).forEach(([name, adapter]) => {
        this.executor.registerAdapter(name, adapter);
      });
    }
  }
  
  /**
   * Create an LLM adapter based on the configuration
   */
  private createLLMAdapter(): LLMAdapter {
    if (this.config.llmAdapter === 'custom' && this.config.customLLMAdapter) {
      return this.config.customLLMAdapter;
    }
    
    const adapterConfig = this.config.llmAdapterConfig || {};
    
    switch (this.config.llmAdapter) {
      case 'craftacoder':
        return new CraftacoderAdapter({
          apiKey: adapterConfig.apiKey || process.env.CRAFTACODER_API_KEY,
          baseUrl: adapterConfig.baseUrl || process.env.CRAFTACODER_API_BASE || 'http://localhost:3000',
          model: adapterConfig.model || process.env.CRAFTACODER_MODEL || 'claude-3-sonnet-20240229',
          provider: adapterConfig.provider || process.env.CRAFTACODER_PROVIDER || 'anthropic'
        });
        
      case 'anthropic':
        return new AnthropicAdapter({
          apiKey: adapterConfig.apiKey || process.env.ANTHROPIC_API_KEY,
          baseUrl: adapterConfig.baseUrl || process.env.ANTHROPIC_API_BASE || 'https://api.anthropic.com',
          model: adapterConfig.model || process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
        });
        
      case 'openai':
        return new OpenAIAdapter({
          apiKey: adapterConfig.apiKey || process.env.OPENAI_API_KEY,
          baseUrl: adapterConfig.baseUrl || process.env.OPENAI_API_BASE,
          model: adapterConfig.model || process.env.OPENAI_MODEL || 'gpt-4'
        });
        
      case 'ollama':
        return new OllamaAdapter({
          baseUrl: adapterConfig.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
          model: adapterConfig.model || process.env.OLLAMA_MODEL || 'phi4:14b-fp16',
          contextSize: adapterConfig.contextSize || parseInt(process.env.CONTEXT_SIZE || '16384', 10),
          dynamicContextSizing: adapterConfig.dynamicContextSizing !== undefined 
            ? adapterConfig.dynamicContextSizing 
            : process.env.DYNAMIC_SIZING?.toLowerCase() !== 'false'
        });
        
      default:
        throw new Error(`Unsupported LLM adapter type: ${this.config.llmAdapter}`);
    }
  }
  
  /**
   * Initialize the test runner
   * This will initialize all adapters
   */
  async initialize(): Promise<void> {
    if (this.config.verbose) {
      console.log('Initializing test runner...');
    }
    
    try {
      await this.llmAdapter.initialize();
      
      if (this.config.adapters) {
        for (const [name, adapter] of Object.entries(this.config.adapters)) {
          if (this.config.verbose) {
            console.log(`Initializing adapter: ${name}`);
          }
          await adapter.initialize();
        }
      }
      
      if (this.config.verbose) {
        console.log('Test runner initialized');
      }
    } catch (error) {
      console.error('Failed to initialize test runner:', error);
      throw error;
    }
  }
  
  /**
   * Run a test from a file path
   * @param filePath Path to the test file
   * @returns Test results
   */
  async runTestFile(filePath: string): Promise<TestResult> {
    if (this.config.verbose) {
      console.log(`Running test file: ${filePath}`);
    }
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return this.runTest(content);
    } catch (error) {
      console.error(`Failed to run test file ${filePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Run a test from a string
   * @param test Test content as a string
   * @returns Test results
   */
  async runTest(test: string): Promise<TestResult> {
    if (this.config.verbose) {
      console.log('Running test...');
    }
    
    try {
      // Create a timeout for the test
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Parse the test string into a scenario
      const scenario = this.parser.parse(test);
      
      const results = await Promise.race([
        this.executor.executeScenario(scenario),
        new Promise<TestResult>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Test execution timed out after ${this.config.timeout}ms`));
          }, this.config.timeout);
        })
      ]);
      
      // Clear the timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (this.config.verbose) {
        this.logTestResults(results);
      }
      
      return results;
    } catch (error) {
      console.error('Test execution failed:', error);
      throw error;
    }
  }
  
  /**
   * Run all tests in a directory
   * @param directory Directory containing test files
   * @param pattern File pattern to match (default: '**\*.md')
   * @returns Test results by file path
   */
  async runTestDirectory(directory: string, pattern: string = '**/*.md'): Promise<Record<string, TestResult>> {
    if (this.config.verbose) {
      console.log(`Running tests in directory: ${directory}`);
    }
    
    try {
      const testFiles = await this.discoverTestFiles(directory, pattern);
      
      if (testFiles.length === 0) {
        console.warn(`No test files found in ${directory} matching pattern ${pattern}`);
        return {};
      }
      
      if (this.config.verbose) {
        console.log(`Found ${testFiles.length} test files`);
      }
      
      const results: Record<string, TestResult> = {};
      
      for (const file of testFiles) {
        try {
          if (this.config.verbose) {
            console.log(`Running test file: ${file.path}`);
          }
          
          const content = file.content || await fs.promises.readFile(file.path, 'utf-8');
          results[file.path] = await this.runTest(content);
        } catch (error) {
          console.error(`Failed to run test file ${file.path}:`, error);
          results[file.path] = {
            passed: false,
            steps: [],
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
      
      if (this.config.verbose) {
        this.logTestResultsSummary(results);
      }
      
      return results;
    } catch (error) {
      console.error(`Failed to run tests in directory ${directory}:`, error);
      throw error;
    }
  }
  
  /**
   * Discover test files in a directory
   * @param directory Directory to search
   * @param pattern File pattern to match
   */
  private async discoverTestFiles(directory: string, pattern: string): Promise<TestFile[]> {
    // For now, we'll use a simple recursive search
    // In a full implementation, this would use a proper glob library
    const files: TestFile[] = [];
    
    const scanDirectory = async (dir: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push({ path: fullPath });
        }
      }
    };
    
    await scanDirectory(directory);
    return files;
  }
  
  /**
   * Log test results
   * @param results Test results
   */
  private logTestResults(results: TestResult): void {
    console.log('\nTest Results:');
    console.log(`Passed: ${results.passed}`);
    console.log(`Total steps: ${results.steps.length}`);
    console.log(`Passed steps: ${results.steps.filter(s => s.status === 'passed').length}`);
    console.log(`Failed steps: ${results.steps.filter(s => s.status === 'failed').length}`);
    console.log(`Skipped steps: ${results.steps.filter(s => s.status === 'skipped').length}`);
    
    if (results.error) {
      console.log(`Error: ${results.error}`);
    }
    
    console.log('\nDetailed Results:');
    results.steps.forEach((step, index) => {
      console.log(`Step ${index + 1}: ${step.description}`);
      console.log(`  Status: ${step.status}`);
      if (step.error) {
        console.log(`  Error: ${step.error}`);
      }
    });
  }
  
  /**
   * Log test results summary
   * @param results Test results by file path
   */
  private logTestResultsSummary(results: Record<string, TestResult>): void {
    console.log('\nTest Results Summary:');
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed tests: ${passedTests}`);
    console.log(`Failed tests: ${failedTests}`);
    
    if (failedTests > 0) {
      console.log('\nFailed Tests:');
      Object.entries(results)
        .filter(([_, result]) => !result.passed)
        .forEach(([path, result]) => {
          console.log(`- ${path}: ${result.error || 'Failed steps'}`);
        });
    }
  }
  
  /**
   * Clean up the test runner
   * This will clean up all adapters
   */
  async cleanup(): Promise<void> {
    if (this.config.verbose) {
      console.log('Cleaning up test runner...');
    }
    
    try {
      await this.llmAdapter.cleanup();
      
      if (this.config.adapters) {
        for (const [name, adapter] of Object.entries(this.config.adapters)) {
          if (this.config.verbose) {
            console.log(`Cleaning up adapter: ${name}`);
          }
          await adapter.cleanup();
        }
      }
      
      if (this.config.verbose) {
        console.log('Test runner cleaned up');
      }
    } catch (error) {
      console.error('Failed to clean up test runner:', error);
    }
  }
}

/**
 * Create a test runner with the given configuration
 * @param config Test runner configuration
 * @returns A test runner instance
 */
export function createTestRunner(config: TestRunnerConfig): TestRunner {
  return new TestRunner(config);
}