/**
 * Craftacoder Adapter Test
 * 
 * This test verifies the implementation of the CraftacoderAdapter against a real API instance.
 * It follows the craft-a-tester philosophy of testing from an end-user perspective without mocks.
 */

import { CraftacoderAdapter } from '../../src/adapters/CraftacoderAdapter';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// API server process
let apiServer: ChildProcess | null = null;

// Test configuration
const TEST_CONFIG = {
  apiKey: 'test_api_key',
  baseUrl: 'http://localhost:3001', // Use a different port for testing
  model: 'claude-3-sonnet-20240229',
  provider: 'anthropic'
};

/**
 * Starts an API server for testing with proper configuration
 */
async function startApiServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting test API server...');
    
    // Create a temp .env.test file with required settings
    const envPath = path.resolve(__dirname, '../../../api/.env.test');
    const envContent = `
PORT=3001
NODE_ENV=test
API_STORAGE_KEY=test_storage_key
MONGODB_URI=mongodb://localhost:27017/test-db
SKIP_AUTHENTICATION=true
INITIAL_ADMIN_EMAIL=admin@test.com
INITIAL_ADMIN_PASSWORD=password123
INITIAL_ADMIN_NAME=Test Admin
JWT_SECRET=test_secret_key
JWT_EXPIRATION=24h
CRAFTACODER_API_KEY=test_api_key
`;
    
    fs.writeFileSync(envPath, envContent);
    
    // Start the API server
    const server = spawn('npm', ['run', 'dev'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3001',
        SKIP_AUTHENTICATION: 'true',
        API_STORAGE_KEY: 'test_storage_key',
        CRAFTACODER_API_KEY: 'test_api_key'
      },
      cwd: path.resolve(__dirname, '../../../api'),
      stdio: 'pipe' // Capture output
    });
    
    let output = '';
    
    // Capture standard output
    server.stdout?.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(`📤 Server output: ${chunk.trim()}`);
      
      // Server is ready when we see this message
      if (chunk.includes('Server started') || chunk.includes('listening on port')) {
        console.log('✅ API server started on port 3001');
        resolve(server);
      }
    });
    
    // Capture error output
    server.stderr?.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.error(`❌ Server error: ${chunk.trim()}`);
    });
    
    // Handle server process errors
    server.on('error', (error) => {
      console.error('❌ Failed to start API server:', error);
      reject(error);
    });
    
    // Set a timeout in case the server never starts
    const timeout = setTimeout(() => {
      console.error('❌ API server failed to start in time');
      server.kill();
      reject(new Error('API server failed to start in time'));
    }, 30000);
    
    // Clear the timeout if we resolve or reject before it fires
    server.on('close', () => clearTimeout(timeout));
  });
}

/**
 * Waits for the API server to be ready to accept requests
 */
async function waitForServer(url: string, maxAttempts = 30, interval = 1000): Promise<void> {
  console.log(`⏳ Waiting for server at ${url}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('✅ Server is ready to accept requests');
        return;
      }
    } catch (error) {
      // Ignore errors, just retry
    }
    
    console.log(`⏳ Attempt ${attempt}/${maxAttempts} - waiting for server...`);
    await new Promise(r => setTimeout(r, interval));
  }
  
  throw new Error(`Server at ${url} not available after ${maxAttempts} attempts`);
}

/**
 * Runs the adapter tests against a real API instance
 */
async function testAdapter() {
  console.log('🧪 Starting CraftacoderAdapter Tests...');
  
  try {
    // Start API server for testing
    apiServer = await startApiServer();
    
    // Wait for the server to be ready
    await waitForServer(TEST_CONFIG.baseUrl);
    
    // Create the adapter
    const adapter = new CraftacoderAdapter(TEST_CONFIG);
    
    // Initialize the adapter
    console.log('\n📋 Test 1: Adapter Initialization');
    await adapter.initialize();
    console.log('✅ Adapter initialized successfully');
    
    // Test basic completion
    console.log('\n📋 Test 2: Basic Text Completion');
    const prompt = 'What is TypeScript? Answer in one sentence.';
    console.log(`Sending prompt: "${prompt}"`);
    
    try {
      const response = await adapter.complete(prompt);
      console.log(`Received response: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);
      console.log('✅ Basic completion test passed');
    } catch (error) {
      console.error('❌ Completion test failed:', error);
      throw error;
    }
    
    // Test action suggestion
    console.log('\n📋 Test 3: Action Suggestion');
    const instructionText = 'Click the Submit button';
    const screenState = {
      title: 'Test Form',
      url: 'https://example.com/form',
      elements: [
        { type: 'button', text: 'Submit', id: 'submit-btn' },
        { type: 'button', text: 'Cancel', id: 'cancel-btn' }
      ]
    };
    
    try {
      console.log(`Sending instruction: "${instructionText}"`);
      const action = await adapter.suggestAction(instructionText, screenState);
      console.log(`Received action suggestion: ${JSON.stringify(action, null, 2)}`);
      console.log('✅ Action suggestion test passed');
    } catch (error) {
      console.error('❌ Action suggestion test failed:', error);
      throw error;
    }
    
    // Test condition verification
    console.log('\n📋 Test 4: Condition Verification');
    const condition = 'The page should display "Success"';
    const verificationState = {
      title: 'Success Page',
      url: 'https://example.com/success',
      elements: [
        { type: 'heading', text: 'Success', id: 'success-heading' },
        { type: 'paragraph', text: 'Your form has been submitted successfully.', id: 'success-message' }
      ]
    };
    
    try {
      console.log(`Verifying condition: "${condition}"`);
      const verification = await adapter.verifyCondition(condition, verificationState);
      console.log(`Received verification result: ${JSON.stringify(verification, null, 2)}`);
      console.log('✅ Condition verification test passed');
    } catch (error) {
      console.error('❌ Condition verification test failed:', error);
      throw error;
    }
    
    // Test cleanup
    console.log('\n📋 Test 5: Adapter Cleanup');
    await adapter.cleanup();
    console.log('✅ Adapter cleaned up successfully');
    
    console.log('\n🎉 All CraftacoderAdapter tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // Clean up the API server
    if (apiServer) {
      console.log('🧹 Shutting down test API server...');
      apiServer.kill();
    }
  }
}

// Run the tests
testAdapter().catch(console.error);