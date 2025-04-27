import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { createTestRunner, LLMAdapterType } from '../../core/TestRunner';

interface RunTestsOptions {
  adapter: LLMAdapterType;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  contextSize?: string;
  dynamic?: boolean;
  caching?: boolean;
  cachePath?: string;
  verbose?: boolean;
  timeout?: string;
  pattern?: string;
}

/**
 * Add the run-tests command to the CLI
 * @param program Commander program instance
 */
export function addRunTestsCommand(program: Command): void {
  program
    .command('run-tests')
    .description('Run test stories from a directory')
    .argument('<directory>', 'Directory containing test stories')
    .option('-a, --adapter <adapter>', 'LLM adapter to use (anthropic, openai, ollama)', 'ollama')
    .option('-m, --model <model>', 'Model to use with the LLM adapter')
    .option('-k, --api-key <apiKey>', 'API key for the LLM adapter')
    .option('-u, --base-url <baseUrl>', 'Base URL for the LLM adapter')
    .option('-c, --context-size <size>', 'Context size for the LLM adapter', '16384')
    .option('-d, --dynamic', 'Enable dynamic context sizing', true)
    .option('--no-dynamic', 'Disable dynamic context sizing')
    .option('--caching', 'Enable caching', true)
    .option('--no-caching', 'Disable caching')
    .option('--cache-path <path>', 'Path to the cache file')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-t, --timeout <timeout>', 'Timeout for test execution in milliseconds', '60000')
    .option('-p, --pattern <pattern>', 'File pattern to match (default: "**/*.md")', '**/*.md')
    .action(async (directoryArg: string, options: RunTestsOptions) => {
      const directory = path.resolve(directoryArg);
      
      // Check if directory exists
      if (!fs.existsSync(directory)) {
        console.error(`Directory does not exist: ${directory}`);
        process.exit(1);
      }
      
      // Configure the adapter
      const adapterConfig: Record<string, any> = {};
      
      if (options.model) adapterConfig.model = options.model;
      if (options.apiKey) adapterConfig.apiKey = options.apiKey;
      if (options.baseUrl) adapterConfig.baseUrl = options.baseUrl;
      if (options.contextSize) adapterConfig.contextSize = parseInt(options.contextSize, 10);
      if (options.dynamic !== undefined) adapterConfig.dynamicContextSizing = options.dynamic;
      
      // Create the test runner
      const runner = createTestRunner({
        llmAdapter: options.adapter as LLMAdapterType,
        llmAdapterConfig: adapterConfig,
        caching: options.caching,
        cachePath: options.cachePath,
        verbose: options.verbose,
        timeout: options.timeout ? parseInt(options.timeout, 10) : 60000
      });
      
      try {
        // Initialize the runner
        await runner.initialize();
        
        // Run the tests
        console.log(`Running tests in ${directory} with pattern ${options.pattern || '**/*.md'}...`);
        const results = await runner.runTestDirectory(directory, options.pattern);
        
        // Calculate summary
        const totalTests = Object.keys(results).length;
        const passedTests = Object.values(results).filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n=== Test Summary ===');
        console.log(`Total tests: ${totalTests}`);
        console.log(`Passed tests: ${passedTests}`);
        console.log(`Failed tests: ${failedTests}`);
        
        // Set exit code based on test results
        process.exit(failedTests > 0 ? 1 : 0);
      } catch (error) {
        console.error('Test execution failed:', error);
        process.exit(1);
      } finally {
        // Clean up
        await runner.cleanup();
      }
    });
}