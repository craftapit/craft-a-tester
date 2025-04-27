import { TestRunner } from '../src';
import { BrowserAdapter } from '../src/adapters/BrowserAdapter';
import { APIAdapter } from '../src/adapters/APIAdapter';
import { DatabaseAdapter } from '../src/adapters/DatabaseAdapter';
import { AnthropicAdapter } from '../src/adapters/AnthropicAdapter';

async function runMultiAdapterTest() {
  const runner = new TestRunner({
    llm: {
      provider: 'anthropic',
      model: 'claude-2',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  });
  
  // Register all adapters
  const llmAdapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-2'
  });
  
  const browserAdapter = new BrowserAdapter({
    headless: false
  });
  
  const apiAdapter = new APIAdapter({
    baseUrl: 'https://jsonplaceholder.typicode.com'
  });
  
  const dbAdapter = new DatabaseAdapter({
    type: 'postgres',
    mockMode: true,
    mockResults: {
      // Mock results for database queries
      'SELECT * FROM users': {
        rows: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
        ],
        rowCount: 2
      }
    }
  });
  
  runner.registerAdapter('llm', llmAdapter);
  runner.registerAdapter('browser', browserAdapter);
  runner.registerAdapter('api', apiAdapter);
  runner.registerAdapter('database', dbAdapter);
  
  // Run tests of different types
  console.log('\n--- Running UI Test ---');
  const uiResults = await runner.runScenario('./examples/ui-test.md');
  console.log(`UI Test passed: ${uiResults.success}`);
  
  console.log('\n--- Running API Test ---');
  const apiResults = await runner.runScenario('./examples/api-test.md');
  console.log(`API Test passed: ${apiResults.success}`);
  
  console.log('\n--- Running Database Test ---');
  const dbResults = await runner.runScenario('./examples/db-test.md');
  console.log(`Database Test passed: ${dbResults.success}`);
  
  // Print summary
  console.log('\n--- Test Summary ---');
  console.log(`UI Test: ${uiResults.success ? 'PASS' : 'FAIL'}`);
  console.log(`API Test: ${apiResults.success ? 'PASS' : 'FAIL'}`);
  console.log(`Database Test: ${dbResults.success ? 'PASS' : 'FAIL'}`);
}

runMultiAdapterTest().catch(console.error);
