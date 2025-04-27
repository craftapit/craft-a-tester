import { TestExecutor } from '../src/core/TestExecutor';
import { AnthropicAdapter } from '../src/adapters/AnthropicAdapter';
import { APIAdapter } from '../src/adapters/APIAdapter';
import { CraftACoderIntegration } from '../src/integrations/CraftACoderIntegration';
import { formatResults } from '../src/cli/utils/formatter';
import chalk from 'chalk';

/**
 * This example demonstrates the simplified execution flow of craft-a-tester,
 * focusing on executing natural language test scenarios without code generation,
 * and showing integration with CraftACoder for implementation when needed.
 */
async function runSimplifiedFlow() {
  console.log(chalk.bold('🧪 Running simplified craft-a-tester flow'));
  console.log(chalk.dim('This demonstrates the focused natural language test execution'));
  console.log('');

  // 1. Create a TestExecutor
  const executor = new TestExecutor({
    api: {
      baseUrl: 'https://jsonplaceholder.typicode.com'
    },
    logging: {
      level: 'info',
      screenshots: false
    }
  });

  // 2. Register necessary adapters
  console.log(chalk.yellow('Registering adapters...'));
  const apiAdapter = new APIAdapter({
    baseUrl: 'https://jsonplaceholder.typicode.com'
  });

  // In a real scenario, you'd use your own API key
  const llmAdapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy_key',
    model: 'claude-2'
  });

  executor.registerAdapter('api', apiAdapter);
  executor.registerAdapter('llm', llmAdapter);

  // 3. Run the test scenario
  const scenarioPath = './examples/api-test.md';
  
  try {
    console.log(chalk.yellow(`Running scenario: ${scenarioPath}`));
    
    // First try running the test (likely to fail if not implemented)
    const results = await executor.runScenario(scenarioPath);
    
    console.log('');
    console.log(formatResults(results));
    console.log('');
    
    if (results.success) {
      console.log(chalk.green('✅ Test passed! Implementation exists.'));
    } else {
      console.log(chalk.red('❌ Test failed! Implementation may be missing.'));
      
      // 4. Use CraftACoder integration for implementation
      console.log('');
      console.log(chalk.yellow('Using CraftACoder to generate implementation...'));
      
      const craftacoder = new CraftACoderIntegration({
        workingDir: process.cwd()
      });
      
      await craftacoder.initialize();
      
      // This would actually call the craftacoder CLI to generate implementation
      // Here we're just simulating the flow
      console.log(chalk.dim('craftacoder generate --from-test ./examples/api-test.md'));
      
      // In a real scenario, craftacoder would generate implementation files
      // Then we would run the tests again to verify the implementation works
      console.log('');
      console.log(chalk.green('✅ Implementation generated successfully!'));
      console.log(chalk.green('✅ You can now run the tests again to verify the implementation.'));
      
      await craftacoder.cleanup();
    }
  } catch (error) {
    console.error(chalk.red('Error running scenario:'), error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runSimplifiedFlow().catch(console.error);
}