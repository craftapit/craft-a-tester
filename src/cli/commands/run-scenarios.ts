import * as fs from 'fs/promises';
import * as path from 'path';
import { TestExecutor } from '../../core/TestExecutor';
import { loadConfig } from '../utils/config';
import { formatResults } from '../utils/formatter';
import { Logger } from '../../utils/logger';
import chalk from 'chalk';
import ora from 'ora';

export async function runScenarios(directory: string, options: any) {
  const logger = new Logger('CLI');
  const spinner = ora('Initializing test executor...').start();
  
  try {
    // Load config from file or use defaults with CLI overrides
    const config = await loadConfig(options.config, options);
    
    // Find all scenario files
    spinner.text = `Finding scenarios in ${directory}...`;
    const scenarioPaths = await findScenarios(directory, options.recursive);
    
    if (scenarioPaths.length === 0) {
      spinner.fail(`No scenario files found in ${directory}`);
      process.exit(1);
    }
    
    spinner.succeed(`Found ${scenarioPaths.length} scenario files`);
    
    // Initialize test executor
    const executor = new TestExecutor(config);
    
    // Initialize appropriate adapters based on config
    await initializeAdapters(executor, config);
    
    // Run all scenarios
    spinner.text = `Running ${scenarioPaths.length} scenarios...`;
    const results = await executor.runScenarios(scenarioPaths);
    
    // Format and display results
    spinner.stop();
    console.log(formatResults(results));
    
    console.log(chalk.bold('\nSummary:'));
    console.log(`Total: ${results.total}`);
    console.log(`Passed: ${chalk.green(results.passed)}`);
    console.log(`Failed: ${chalk.red(results.failed)}`);
    
    // Exit with appropriate code
    process.exit(results.failed === 0 ? 0 : 1);
  } catch (error) {
    spinner.fail('Error running scenarios');
    logger.error('Error running scenarios:', error);
    process.exit(1);
  }
}

async function findScenarios(directory: string, recursive: boolean = false): Promise<string[]> {
  const scenarioPaths: string[] = [];
  
  async function scanDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && recursive) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Check if it's a scenario file by looking for scenario markers
        const content = await fs.readFile(fullPath, 'utf-8');
        if (content.includes('## Scenario:') || content.includes('### Steps')) {
          scenarioPaths.push(fullPath);
        }
      }
    }
  }
  
  await scanDirectory(directory);
  return scenarioPaths;
}

/**
 * Helper function to initialize adapters based on config
 */
async function initializeAdapters(executor: TestExecutor, config: any) {
  // Register LLM adapter
  if (config.llm?.provider === 'anthropic') {
    const { AnthropicAdapter } = await import('../../adapters/AnthropicAdapter');
    executor.registerAdapter('llm', new AnthropicAdapter({
      apiKey: config.llm.apiKey,
      model: config.llm.model || 'claude-2'
    }));
  } else if (config.llm?.provider === 'openai') {
    const { OpenAIAdapter } = await import('../../adapters/OpenAIAdapter');
    executor.registerAdapter('llm', new OpenAIAdapter({
      apiKey: config.llm.apiKey,
      model: config.llm.model || 'gpt-4'
    }));
  } else if (config.llm?.provider === 'ollama') {
    const { OllamaAdapter } = await import('../../adapters/OllamaAdapter');
    executor.registerAdapter('llm', new OllamaAdapter({
      baseUrl: config.llm.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
      model: config.llm.model || process.env.OLLAMA_MODEL || 'phi4:14b-fp16',
      contextSize: config.llm.contextSize || parseInt(process.env.CONTEXT_SIZE || '16384', 10),
      dynamicContextSizing: config.llm.dynamicContextSizing !== undefined 
        ? config.llm.dynamicContextSizing 
        : process.env.DYNAMIC_SIZING?.toLowerCase() !== 'false'
    }));
  }
  
  // Register browser adapter if needed
  if (config.browser) {
    const { BrowserAdapter } = await import('../../adapters/BrowserAdapter');
    executor.registerAdapter('browser', new BrowserAdapter(config.browser));
  }
  
  // Register API adapter if needed
  if (config.api) {
    const { APIAdapter } = await import('../../adapters/APIAdapter');
    executor.registerAdapter('api', new APIAdapter(config.api));
  }
  
  // Register database adapter if needed
  if (config.database) {
    const { DatabaseAdapter } = await import('../../adapters/DatabaseAdapter');
    executor.registerAdapter('database', new DatabaseAdapter(config.database));
  }
}