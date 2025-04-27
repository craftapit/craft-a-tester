import { TestRunner } from '../src';

async function runTests() {
  const runner = new TestRunner({
    browser: {
      headless: false
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY
    }
  });
  
  const results = await runner.runScenario('./examples/login-test.md');
  
  console.log(`Test passed: ${results.success}`);
  console.log('Results:', JSON.stringify(results, null, 2));
}

runTests().catch(console.error);
