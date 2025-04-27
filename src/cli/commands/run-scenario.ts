import { TestExecutor } from '../../core/TestExecutor';
import { loadConfig } from '../utils/config';
import { formatResults } from '../utils/formatter';
import { Logger } from '../../utils/logger';
import chalk from 'chalk';
import ora from 'ora';

export async function runScenario(scenarioPath: string, options: any) {
  const logger = new Logger('CLI');
  const spinner = ora('Initializing test executor...').start();
  
  try {
    // Load config from file or use defaults with CLI overrides
    const config = await loadConfig(options.config, options);
    
    // Initialize test executor
    const executor = new TestExecutor(config);
    
    // Initialize appropriate adapters based on config
    await initializeAdapters(executor, config);
    
    spinner.text = `Running scenario: ${scenarioPath}`;
    const results = await executor.runScenario(scenarioPath);
    
    // Format and display results
    spinner.stop();
    console.log(formatResults(results));
    
    if (results.success) {
      console.log(chalk.green('✅ Test scenario passed!'));
    } else {
      console.log(chalk.red('❌ Test scenario failed!'));
    }
    
    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
  } catch (error) {
    spinner.fail('Error running scenario');
    logger.error('Error running scenario:', error);
    process.exit(1);
  }
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