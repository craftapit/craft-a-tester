import { TestRunner } from '../src';
import { AnthropicAdapter } from '../src/adapters/AnthropicAdapter';
import { OpenAIAdapter } from '../src/adapters/OpenAIAdapter';
import { BrowserAdapter } from '../src/adapters/BrowserAdapter';
import * as fs from 'fs/promises';
import * as path from 'path';

async function createTestScenario(outputPath: string): Promise<string> {
  const content = `# LLM Adapter Comparison Test

## Context
- Environment: Test
- Type: UI

## Scenario: Simple Login Flow

### Steps

1. **Given** I am on the login page
2. **When** I enter my username
3. **When** I enter my password
4. **When** I click the login button
5. **Then** I should be redirected to the dashboard
`;

  await fs.writeFile(outputPath, content);
  return outputPath;
}

async function compareLLMAdapters() {
  console.log('🔍 Comparing LLM Adapters: Anthropic vs OpenAI');
  console.log('------------------------------------------');
  
  // Create a test scenario
  const scenarioPath = path.join(process.cwd(), 'examples', 'llm-comparison-scenario.md');
  await createTestScenario(scenarioPath);
  
  // Mock browser adapter for testing
  class MockBrowserAdapter extends BrowserAdapter {
    private currentUrl = 'https://example.com/login';
    private currentTitle = 'Login Page';
    
    constructor() {
      super({});
    }
    
    async captureScreenState() {
      return {
        url: this.currentUrl,
        title: this.currentTitle,
        elements: [
          { tagName: 'input', id: 'username', placeholder: 'Username' },
          { tagName: 'input', id: 'password', type: 'password' },
          { tagName: 'button', id: 'login', text: 'Login' },
        ]
      };
    }
    
    async executeAction(action: any) {
      console.log(`Mock browser executing: ${action.actionType} on ${JSON.stringify(action.target)}`);
      
      if (action.actionType === 'click' && action.target?.id === 'login') {
        this.currentUrl = 'https://example.com/dashboard';
        this.currentTitle = 'Dashboard';
      }
      
      return { success: true };
    }
  }
  
  // Test with Anthropic
  console.log('\n🧠 Testing with Anthropic Claude');
  console.log('---------------------------');
  
  const anthropicRunner = new TestRunner({
    llm: {
      provider: 'anthropic',
      model: 'claude-2',
      apiKey: process.env.ANTHROPIC_API_KEY
    }
  });
  
  const anthropicAdapter = new AnthropicAdapter({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-2'
  });
  
  const browserAdapter1 = new MockBrowserAdapter();
  
  anthropicRunner.registerAdapter('llm', anthropicAdapter);
  anthropicRunner.registerAdapter('browser', browserAdapter1);
  
  console.log('Running test with Anthropic...');
  const startAnthropicTime = Date.now();
  const anthropicResults = await anthropicRunner.runScenario(scenarioPath);
  const anthropicDuration = Date.now() - startAnthropicTime;
  
  console.log(`Test ${anthropicResults.success ? 'PASSED' : 'FAILED'}`);
  console.log(`Duration: ${anthropicDuration}ms`);
  
  // Test with OpenAI
  console.log('\n🧠 Testing with OpenAI GPT');
  console.log('----------------------');
  
  const openaiRunner = new TestRunner({
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: process.env.OPENAI_API_KEY
    }
  });
  
  const openaiAdapter = new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4'
  });
  
  const browserAdapter2 = new MockBrowserAdapter();
  
  openaiRunner.registerAdapter('llm', openaiAdapter);
  openaiRunner.registerAdapter('browser', browserAdapter2);
  
  console.log('Running test with OpenAI...');
  const startOpenAITime = Date.now();
  const openaiResults = await openaiRunner.runScenario(scenarioPath);
  const openaiDuration = Date.now() - startOpenAITime;
  
  console.log(`Test ${openaiResults.success ? 'PASSED' : 'FAILED'}`);
  console.log(`Duration: ${openaiDuration}ms`);
  
  // Compare results
  console.log('\n📊 Comparison Results');
  console.log('------------------');
  console.log(`Anthropic: ${anthropicResults.success ? 'PASS' : 'FAIL'} (${anthropicDuration}ms)`);
  console.log(`OpenAI: ${openaiResults.success ? 'PASS' : 'FAIL'} (${openaiDuration}ms)`);
  console.log(`Speed difference: ${Math.abs(anthropicDuration - openaiDuration)}ms (${
    anthropicDuration < openaiDuration ? 'Anthropic faster' : 'OpenAI faster'
  })`);
  
  // Clean up
  await fs.unlink(scenarioPath).catch(() => {});
}

// Run the comparison
compareLLMAdapters().catch(console.error);
