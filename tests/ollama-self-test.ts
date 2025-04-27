import { ScenarioParser, TestExecutor } from '../src';
import { OllamaAdapter } from '../src/adapters/OllamaAdapter';
import * as path from 'path';
import * as fs from 'fs/promises';

async function runOllamaSelfTests() {
  console.log('🧪 Running craft-a-tester Ollama self-tests...');
  
  // Initialize the test executor with Ollama adapter
  console.log('Initializing test executor with Ollama adapter...');
  
  // Get configuration from environment variables or use defaults
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';
  const contextSize = parseInt(process.env.CONTEXT_SIZE || '16384');
  const dynamicSizing = process.env.DYNAMIC_SIZING !== 'false'; // Enable by default
  
  console.log(`Using Ollama configuration:
  - URL: ${ollamaUrl}
  - Model: ${ollamaModel}
  - Context Size: ${contextSize}
  - Dynamic Sizing: ${dynamicSizing ? 'Enabled' : 'Disabled'}`);
  
  // Create the Ollama adapter
  const adapter = new OllamaAdapter({
    baseUrl: ollamaUrl,
    model: ollamaModel,
    contextSize: contextSize,
    dynamicContextSizing: dynamicSizing
  });
  
  // Test 1: Adapter initialization
  console.log('\n🔬 Test 1: Adapter initialization');
  try {
    await adapter.initialize();
    console.log('✅ Adapter initialized successfully');
  } catch (error) {
    console.error('❌ Adapter initialization failed:', error);
    process.exit(1);
  }
  
  // Test 2: Simple completion
  console.log('\n🔬 Test 2: Simple completion test with dynamic context sizing');
  try {
    const prompt = 'What is TypeScript? Answer in one sentence.';
    const response = await adapter.complete(prompt);
    
    console.log(`Response length: ${response.length} characters`);
    
    if (response.length > 0) {
      console.log('✅ Received non-empty response');
      console.log(`Response preview: ${response.substring(0, 100)}...`);
    } else {
      console.error('❌ Received empty response');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Completion test failed:', error);
    process.exit(1);
  }
  
  // Test 2.1: Medium completion with dynamic context sizing
  console.log('\n🔬 Test 2.1: Dynamic context sizing for medium input');
  try {
    // Create a medium length prompt to test dynamic sizing
    let mediumPrompt = 'Explain the differences between TypeScript and JavaScript, covering: \n';
    mediumPrompt += '1. Type system\n2. Compilation\n3. Error detection\n';
    
    console.log(`Medium prompt created with ${mediumPrompt.length} characters`);
    const response = await adapter.complete(mediumPrompt);
    
    console.log(`Response length: ${response.length} characters`);
    
    if (response.length > 0) {
      console.log('✅ Received non-empty response for long prompt');
      console.log(`Response preview: ${response.substring(0, 100)}...`);
    } else {
      console.error('❌ Received empty response for long prompt');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Long prompt test failed:', error);
    process.exit(1);
  }
  
  // Test 3: Parse a simple test scenario
  console.log('\n🔬 Test 3: ScenarioParser test');
  try {
    const parser = new ScenarioParser();
    
    // Create a temporary test scenario file
    const testFilePath = path.join(__dirname, 'temp-test-scenario.md');
    const testContent = `
# Test Scenario
    
## Context
- Type: Unit
- Environment: Test
    
## Scenario: Simple Test
    
### Steps
1. **Given** a condition
2. **When** an action is performed
3. **Then** a result occurs
`;
    
    // Write test content to file
    await fs.writeFile(testFilePath, testContent);
    
    // Parse the scenario
    const parsedScenario = await parser.parseScenario(testFilePath);
    
    console.log('Parsed scenario:');
    console.log(`- Title: ${parsedScenario.title}`);
    console.log(`- Test Type: ${parsedScenario.testType}`);
    console.log(`- Steps: ${parsedScenario.steps.length}`);
    
    if (parsedScenario.steps.length === 3) {
      console.log('✅ Successfully parsed test scenario');
      console.log(`Parsed scenario with ${parsedScenario.steps.length} steps`);
    } else {
      console.error('❌ Failed to parse test scenario correctly');
      console.error(`Expected 3 steps, got ${parsedScenario.steps.length}`);
      process.exit(1);
    }
    
    // Clean up
    await fs.unlink(testFilePath);
  } catch (error) {
    console.error('❌ ScenarioParser test failed:', error);
    process.exit(1);
  }
  
  // Test 4: Create a test executor and register the adapter
  console.log('\n🔬 Test 4: TestExecutor registration');
  try {
    const executor = new TestExecutor();
    executor.registerAdapter('llm', adapter);
    console.log('✅ Successfully registered adapter with TestExecutor');
  } catch (error) {
    console.error('❌ TestExecutor registration failed:', error);
    process.exit(1);
  }
  
  // All tests passed
  console.log('\n🎉 All Ollama self-tests passed!');
  
  // Clean up
  await adapter.cleanup();
}

// Run the self-tests
runOllamaSelfTests().catch(error => {
  console.error('Self-tests failed with an error:', error);
  process.exit(1);
});