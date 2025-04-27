/**
 * Self-test for craft-a-tester using its own TestRunner API.
 * 
 * This provides a way to "dogfood" the craft-a-tester framework by using
 * it to test itself.
 */
import * as path from 'path';
import { createTestRunner } from '../src/core/TestRunner';

async function runSelfTestStories() {
  // Get the base stories directory
  const storiesDir = path.join(__dirname, 'stories');
  
  // Create a test runner with the LLM adapter from environment variables
  const runner = createTestRunner({
    llmAdapter: (process.env.LLM_ADAPTER || 'ollama') as any,
    llmAdapterConfig: {
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3',
      contextSize: parseInt(process.env.CONTEXT_SIZE || '16384', 10),
      dynamicContextSizing: process.env.DYNAMIC_SIZING?.toLowerCase() !== 'false',
      apiKey: process.env.API_KEY
    },
    caching: true,
    cachePath: path.join(__dirname, '.cache', 'self-test-cache.json'),
    verbose: true
  });
  
  try {
    // Initialize the runner
    await runner.initialize();
    
    // Run the tests
    console.log('Running craft-a-tester self-test stories...');
    
    // You can run all tests or specific directories
    const results = await runner.runTestDirectory(storiesDir);
    
    // Print summary
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n===== craft-a-tester Self-Test Stories Summary =====');
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed tests: ${passedTests}`);
    console.log(`Failed tests: ${failedTests}`);
    
    if (failedTests > 0) {
      console.log('\nFailed Tests:');
      Object.entries(results)
        .filter(([_, result]) => !result.passed)
        .forEach(([path, result]) => {
          console.log(`- ${path.replace(storiesDir, '')}: ${result.error || 'Failed steps'}`);
        });
      
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  } finally {
    // Clean up
    await runner.cleanup();
  }
}

// Run the tests if this script is called directly
if (require.main === module) {
  runSelfTestStories().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}