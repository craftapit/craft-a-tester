import { TestRunner, ScenarioParser } from '../src';
import { AnthropicAdapter } from '../src/adapters/AnthropicAdapter';
import { BrowserAdapter } from '../src/adapters/BrowserAdapter';
import { APIAdapter } from '../src/adapters/APIAdapter';
import { DatabaseAdapter } from '../src/adapters/DatabaseAdapter';
import { UIAction } from '../src/types/actions';
import * as fs from 'fs/promises';
import * as path from 'path';
import assert from 'assert';

// Mock implementation of a browser adapter for testing
class MockBrowserAdapter extends BrowserAdapter {
  private currentUrl = 'https://example.com/test';
  private currentTitle = 'Test Page';
  
  constructor() {
    super({});
  }
  
  async captureScreenState() {
    return {
      url: this.currentUrl,
      title: this.currentTitle,
      elements: [
        { tagName: 'button', id: 'submit', text: 'Submit' },
        { tagName: 'input', id: 'username', placeholder: 'Username' },
        { tagName: 'input', id: 'password', type: 'password' },
        // Add an element that indicates successful login (when logged in)
        ...(this.currentUrl.includes('dashboard') ? [
          { tagName: 'div', id: 'welcome-message', text: 'Welcome, User!' }
        ] : [])
      ]
    };
  }
  
  async executeAction(action: UIAction) {
    console.log(`Mock browser executing: ${action.actionType}`);
    
    // Update the state based on the action
    if (action.actionType === 'click' && 
        action.target && 
        typeof action.target === 'object' && 
        action.target.text === 'Submit') {
      // After clicking submit, change the URL and title to simulate successful login
      this.currentUrl = 'https://example.com/dashboard';
      this.currentTitle = 'Dashboard - Logged In';
    }
    
    return { success: true };
  }
  
  async captureScreenshot() {
    return Buffer.from('mock-screenshot');
  }
}

// Mock implementation of Anthropic adapter for testing
class MockAnthropicAdapter extends AnthropicAdapter {
  constructor() {
    super({
      apiKey: 'mock-key',
      model: 'claude-2'
    });
  }
  
  async initialize(): Promise<void> {
    console.log('Initializing Mock Anthropic adapter');
    // No need to check for API key in mock
  }
  
  async suggestAction(
    instruction: string,
    screenState: any
  ): Promise<UIAction> {
    console.log(`Suggesting action for: ${instruction}`);
    
    if (instruction.toLowerCase().includes('username')) {
      return {
        actionType: 'input',
        target: { id: 'username' },
        value: 'testuser',
        reasoning: 'Entering username as instructed',
        confidence: 0.9
      };
    } else if (instruction.toLowerCase().includes('password')) {
      return {
        actionType: 'input',
        target: { id: 'password' },
        value: 'password123',
        reasoning: 'Entering password as instructed',
        confidence: 0.9
      };
    } else if (instruction.toLowerCase().includes('click') && 
               instruction.toLowerCase().includes('submit')) {
      return {
        actionType: 'click',
        target: { id: 'submit', text: 'Submit' },
        reasoning: 'Clicking submit button as instructed',
        confidence: 0.9
      };
    }
    
    return {
      actionType: 'click',
      target: { text: 'Submit' },
      reasoning: 'Default action',
      confidence: 0.7
    };
  }
  
  async verifyCondition(
    condition: string,
    screenState: any
  ): Promise<{ success: boolean; reason?: string }> {
    console.log(`Verifying condition: ${condition}`);
    
    // Check if the condition is about being logged in
    if (condition.toLowerCase().includes('logged in')) {
      // Check if the screen state indicates successful login
      const isLoggedIn = 
        screenState.url.includes('dashboard') || 
        screenState.title.includes('Dashboard') ||
        screenState.elements.some((el: { id: string; text: string | string[]; }) => 
          el.id === 'welcome-message' || 
          (el.text && el.text.includes('Welcome'))
        );
      
      return {
        success: isLoggedIn,
        reason: isLoggedIn 
          ? 'User is successfully logged in' 
          : 'User is not logged in'
      };
    }
    
    // Default to success for other conditions in the test
    return { success: true };
  }
}

async function testAPIAdapter() {
  console.log('\n--- Testing APIAdapter ---');
  
  const apiAdapter = new APIAdapter({
    baseUrl: 'https://jsonplaceholder.typicode.com'
  });
  
  await apiAdapter.initialize();
  
  try {
    // Test GET request
    const getResponse = await apiAdapter.makeRequest({
      method: 'GET',
      url: '/users/1'
    });
    
    console.log('GET response status:', getResponse.status);
    console.log('GET response body:', getResponse.body);
    
    // Verify the response
    const getVerification = await apiAdapter.verifyResponse({
      status: 200,
      bodyContains: { id: 1 }
    });
    
    assert.strictEqual(getVerification.success, true, 'GET verification should succeed');
    
    // Test POST request
    const postResponse = await apiAdapter.makeRequest({
      method: 'POST',
      url: '/posts',
      body: {
        title: 'Test Post',
        body: 'This is a test post',
        userId: 1
      }
    });
    
    console.log('POST response status:', postResponse.status);
    console.log('POST response body:', postResponse.body);
    
    // Verify the response
    const postVerification = await apiAdapter.verifyResponse({
      status: 201,
      bodyContains: { title: 'Test Post' }
    });
    
    assert.strictEqual(postVerification.success, true, 'POST verification should succeed');
    
    console.log('✅ APIAdapter test passed!');
  } finally {
    await apiAdapter.cleanup();
  }
}

async function testDatabaseAdapter() {
  console.log('\n--- Testing DatabaseAdapter ---');
  
  const dbAdapter = new DatabaseAdapter({
    type: 'postgres',
    mockMode: true,
    mockResults: {
      'SELECT * FROM users WHERE id = 1': {
        rows: [{ id: 1, name: 'John Doe', email: 'john@example.com' }],
        rowCount: 1
      },
      'INSERT INTO users (name, email) VALUES (?, ?)': {
        rows: [],
        rowCount: 1
      },
      'SELECT * FROM users WHERE email = ?': {
        rows: [{ id: 2, name: 'Test User', email: 'test@example.com' }],
        rowCount: 1
      }
    }
  });
  
  await dbAdapter.initialize();
  
  try {
    // Test SELECT query
    const selectResult = await dbAdapter.executeQuery(
      'SELECT * FROM users WHERE id = 1'
    );
    
    console.log('SELECT result:', selectResult);
    
    // Verify the result
    const selectVerification = await dbAdapter.verifyQueryResult({
      rowCount: 1,
      rowsContain: [{ name: 'John Doe' }]
    });
    
    assert.strictEqual(selectVerification.success, true, 'SELECT verification should succeed');
    
    // Test INSERT query
    const insertResult = await dbAdapter.executeQuery(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['Test User', 'test@example.com']
    );
    
    console.log('INSERT result:', insertResult);
    
    // Verify the result
    const insertVerification = await dbAdapter.verifyQueryResult({
      rowCount: 1
    });
    
    assert.strictEqual(insertVerification.success, true, 'INSERT verification should succeed');
    
    console.log('✅ DatabaseAdapter test passed!');
  } finally {
    await dbAdapter.cleanup();
  }
}

async function runSelfTest() {
  console.log('Starting craft-a-tester self-test...');
  
  // Test 1: Verify ScenarioParser works correctly
  await testScenarioParser();
  
  // Test 2: Verify TestRunner with Anthropic adapter
  await testRunnerWithAnthropicAdapter();
  
  // Test 3: Verify APIAdapter
  await testAPIAdapter();
  
  // Test 4: Verify DatabaseAdapter
  await testDatabaseAdapter();
  
  console.log('\nAll self-tests completed successfully!');
}

async function testScenarioParser() {
  console.log('\n--- Testing ScenarioParser ---');
  
  const parser = new ScenarioParser();
  const scenarioPath = path.join(__dirname, 'scenarios', 'framework-test.md');
  
  const scenario = await parser.parseScenario(scenarioPath);
  
  console.log('Parsed scenario:');
  console.log('- Title:', scenario.title);
  console.log('- Context:', JSON.stringify(scenario.context));
  console.log('- Steps:', scenario.steps.length);
  
  // Perform actual assertions
  assert.strictEqual(scenario.title, 'Framework Self-Test', 'Title should match');
  assert.strictEqual(scenario.context.LLM, 'Anthropic Claude', 'Context should contain LLM info');
  assert.strictEqual(scenario.steps.length, 5, 'Should have 5 steps in first scenario');
  assert.strictEqual(scenario.steps[0].type, 'given', 'First step should be a "given"');
  assert.strictEqual(scenario.steps[0].instruction, 'I have a simple test scenario file', 'First step instruction should match');
  
  console.log('✅ ScenarioParser test passed!');
}

async function testRunnerWithAnthropicAdapter() {
  console.log('\n--- Testing TestRunner with Anthropic adapter ---');
  
  const runner = new TestRunner({
    llm: {
      provider: 'anthropic',
      model: 'claude-2',
      apiKey: 'mock-key' // Use a mock key
    }
  });
  
  // Register the mock adapters
  const anthropicAdapter = new MockAnthropicAdapter();
  const browserAdapter = new MockBrowserAdapter();
  
  runner.registerAdapter('llm', anthropicAdapter);
  runner.registerAdapter('browser', browserAdapter);
  
  // Create a simple test scenario for this test
  const tempScenarioPath = path.join(__dirname, 'temp-test-scenario.md');
  await fs.writeFile(tempScenarioPath, `
# Simple Login Test

## Context
- Environment: Test
- Type: UI

## Scenario: Basic Login Flow

### Steps

1. **Given** I am on the login page
2. **When** I enter my username
3. **When** I enter my password
4. **When** I click the submit button
5. **Then** I should be logged in successfully
`);
  
  try {
    // Run the test scenario
    const results = await runner.runScenario(tempScenarioPath);
    
    console.log('\nTest results:');
    console.log('- Success:', results.success);
    console.log('- Duration:', results.duration, 'ms');
    console.log('- Steps completed:', results.stepResults.length);
    
    // Print detailed results
    console.log('\nDetailed step results:');
    results.stepResults.forEach((step, index) => {
      console.log(`${index + 1}. ${step.step} - ${step.success ? 'PASS' : 'FAIL'}`);
      if (!step.success && step.error) {
        console.log(`   Error: ${step.error}`);
      }
    });
    
    // Perform actual assertions
    assert.strictEqual(results.success, true, 'Test should pass');
    assert.strictEqual(results.stepResults.length, 5, 'Should have 5 step results');
    results.stepResults.forEach(step => {
      assert.strictEqual(step.success, true, `Step "${step.step}" should pass`);
    });
    
    console.log('✅ TestRunner with Anthropic adapter test passed!');
  } finally {
    // Clean up the temporary file
    await fs.unlink(tempScenarioPath).catch(() => {});
  }
}

runSelfTest().catch(error => {
  console.error('Self-test failed:', error);
  process.exit(1);
});
