import { TestExecutor } from '../src/core/TestExecutor';
import { APIAdapter } from '../src/adapters/APIAdapter';
import { AnthropicAdapter } from '../src/adapters/AnthropicAdapter';

/**
 * Simple example showing how to run an API test scenario
 */
async function runApiTest() {
  // Initialize the TestExecutor
  const testExecutor = new TestExecutor({
    logging: {
      level: 'info'
    }
  });
  
  // Create and register adapters
  const apiAdapter = new APIAdapter({
    baseUrl: 'https://jsonplaceholder.typicode.com'
  });
  
  const llmAdapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key',
    model: 'claude-2'
  });
  
  testExecutor.registerAdapter('api', apiAdapter);
  testExecutor.registerAdapter('llm', llmAdapter);
  
  // Run the scenario
  const scenarioPath = './examples/api-test.md';
  
  try {
    console.log('Running API test scenario...');
    const result = await testExecutor.runScenario(scenarioPath);
    
    console.log(`Test ${result.success ? 'PASSED ✅' : 'FAILED ❌'}`);
    
    // Print step results
    console.log('\nStep Results:');
    result.stepResults.forEach((step, index) => {
      console.log(`${index + 1}. ${step.step} - ${step.success ? '✓' : '✗'}`);
      if (!step.success && step.error) {
        console.log(`   Error: ${step.error}`);
      }
    });
    
    console.log(`\nTest duration: ${result.duration}ms`);
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runApiTest().catch(console.error);
}