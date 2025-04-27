import { TestExecutor, ScenarioParser, CraftACoderIntegration } from "@craftapit/tester";
import { APIAdapter } from "@craftapit/tester";
import { AnthropicAdapter } from "@craftapit/tester";
import * as path from 'path';

/**
 * Example showing craft-a-tester with CraftACoder integration
 * 
 * This example:
 * 1. Parses a test scenario
 * 2. Runs the test (which will fail if not implemented)
 * 3. Generates implementation code using CraftACoder CLI
 * 4. Automatically extracts and implements code from the response
 * 5. Runs the test again (which should now pass)
 */
async function testAndImplementScenario() {
  // Initialize the TestExecutor
  const testExecutor = new TestExecutor({
    logging: {
      level: 'info',
      screenshots: false
    }
  });
  
  // Create and register adapters
  const apiAdapter = new APIAdapter({
    baseUrl: 'https://api.example.com'
  });
  
  const llmAdapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key',
    model: 'claude-3-5-sonnet-20240620'
  });
  
  testExecutor.registerAdapter('api', apiAdapter);
  testExecutor.registerAdapter('llm', llmAdapter);
  
  // Initialize CraftACoder integration
  const craftacoder = new CraftACoderIntegration({
    workingDir: process.cwd(),
    model: 'claude-3-5-sonnet-20240620', // Using more available model to reduce timeout issues
    timeout: 300000, // 5 minute timeout to allow for completion
    routerApiKey: process.env.CRAFTACODER_ROUTER_API_KEY,
    routerUrl: process.env.CRAFTACODER_ROUTER_URL || 'https://coder-api.craftapit.com'
  });
  
  await craftacoder.initialize();
  
  // Parse the scenario
  const scenarioParser = new ScenarioParser();
  const scenarioPath = './examples/focused-api-test.md';
  const scenario = await scenarioParser.parseScenario(scenarioPath);
  
  console.log(`Running scenario: ${scenario.title}`);
  
  // First run (will likely fail due to missing implementation)
  try {
    const firstRunResult = await testExecutor.runScenario(scenarioPath);
    
    if (firstRunResult.success) {
      console.log('✅ Tests passed on first run!');
      return;
    } else {
      console.log('❌ Tests failed on first run as expected');
      
      // Generate implementation with CraftACoder using ask and architect modes
      console.log('Generating implementation with CraftACoder using ask and architect modes...');
      console.log('Step 1: Planning phase (ask mode)...');
      const genOutput = await craftacoder.generateFromTest(scenarioPath);
      console.log('Both planning and implementation completed!');
      
      // Extract and implement code suggestions from the combined output
      console.log('Extracting and implementing code suggestions...');
      const implementedFiles = await craftacoder.extractAndImplementSuggestions(genOutput);
      
      if (implementedFiles.length > 0) {
        console.log(`Implemented ${implementedFiles.length} files:`);
        implementedFiles.forEach(file => {
          console.log(`- ${file}`);
        });
      } else {
        console.log('No files were automatically implemented from the output');
        console.log('This could be because:');
        console.log('- craftacoder might have made edits directly to files');
        console.log('- code blocks might not be properly formatted for automatic extraction');
        console.log('- the implementation requires manual steps');
        
        console.log('\nCheck the output for manual implementation instructions:');
        // Print first 500 characters of output to give a preview
        const previewLength = 500;
        console.log(genOutput.length > previewLength ? 
          genOutput.substring(0, previewLength) + '...' : 
          genOutput);
      }
      
      // Run tests again with the implementation
      console.log('Running tests with generated implementation...');
      const secondRunResult = await testExecutor.runScenario(scenarioPath);
      
      if (secondRunResult.success) {
        console.log('✅ Tests passed after implementation!');
      } else {
        console.log('❌ Tests still failing after implementation');
        console.log('Failures:');
        secondRunResult.stepResults
          .filter(step => !step.success)
          .forEach(step => {
            console.log(`- ${step.step}: ${step.error}`);
          });
        
        // Provide debugging information
        console.log('\nDebugging information:');
        console.log('- The test is likely failing because it\'s trying to connect to a real API');
        console.log('- Consider mocking the API responses in your implementation');
        console.log('- Check the API endpoint URL in the test scenario and make sure it\'s accessible');
      }
    }
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    await craftacoder.cleanup();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  testAndImplementScenario().catch(console.error);
}