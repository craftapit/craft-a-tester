# craft-a-tester

A focused, LLM-powered testing framework that executes natural language test scenarios written in Given-When-Then format.

## Core Functionality

craft-a-tester allows you to:

1. Write test scenarios in plain English using Given-When-Then format
2. Execute these scenarios against APIs, web UIs, or databases
3. Get clear, human-readable test results

## Installation

```bash
# Install globally
npm install -g craft-a-tester

# Or install in your project
npm install --save-dev craft-a-tester
```

## Command Line Usage

```bash
# Run a single test scenario
craft-a-tester run ./tests/login-test.md

# Run all scenarios in a directory
craft-a-tester run-all ./tests --recursive

# Specify a configuration file
craft-a-tester run-all ./tests --config ./craft-a-tester.json
```

## Writing Test Scenarios

Test scenarios are written in markdown files with a specific structure:

```markdown
# User Login Test

## Context
- Type: API
- Environment: Test
- BaseURL: https://api.example.com

## Scenario: Successful Login

### Steps

1. **Given** the API is available
2. **When** I send a POST request to "/auth/login" with body:
   {
     "username": "testuser",
     "password": "password123"
   }
3. **Then** the response status should be 200
4. **And** the response body should contain a token
```

## Configuration

Configure craft-a-tester using a JSON file:

```json
{
  "browser": {
    "headless": false,
    "slowMo": 50
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-2",
    "apiKey": "your-api-key-here"
  }
}
```

### Using Ollama

craft-a-tester supports local LLM inference using Ollama:

```json
{
  "llm": {
    "provider": "ollama",
    "baseUrl": "http://localhost:11434",
    "model": "llama3:8b",
    "contextSize": 16384,
    "dynamicContextSizing": true
  }
}
```

## Integration with CraftACoder

For test-driven development, craft-a-tester works seamlessly with CraftACoder:

1. Write your test scenarios in craft-a-tester's format
2. Execute the scenarios to see what fails
3. Use CraftACoder to generate implementation code:

```bash
# Generate implementation code based on a test scenario
craftacoder generate --from-test ./tests/login-test.md
```

## API Usage

```typescript
import { TestRunner } from "@craftapit/tester";

async function runTests() {
  const runner = new TestRunner({
    browser: {
      headless: false
    },
    llm: {
      provider: 'anthropic',
      model: 'claude-2'
    }
  });
  
  const results = await runner.runScenario('./tests/login-test.md');
  
  console.log(`Test passed: ${results.success}`);
}

runTests().catch(console.error);
```

## Supported Test Types

- API Tests: Test RESTful APIs with JSON payloads
- Browser Tests: Test web UIs with automated browser interactions
- Database Tests: Verify database operations and results
- TypedAPI Tests: Test TypeScript API contracts (requires @craftapit/typedapi-tester-addon)

### Using Different LLM Providers

craft-a-tester supports multiple LLM providers:

```typescript
// Using Anthropic
import { AnthropicAdapter } from "@craftapit/tester";

const anthropicAdapter = new AnthropicAdapter({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-2'
});

runner.registerAdapter('llm', anthropicAdapter);

// Using OpenAI
import { OpenAIAdapter } from "@craftapit/tester";

const openaiAdapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

runner.registerAdapter('llm', openaiAdapter);

// Using Ollama (local inference)
import { OllamaAdapter } from "@craftapit/tester";

const ollamaAdapter = new OllamaAdapter({
  baseUrl: 'http://localhost:11434',  // Your Ollama server URL
  model: 'llama3:8b',                 // Model to use
  contextSize: 16384,                 // Context window size
  dynamicContextSizing: true          // Automatically adjust context size
});

runner.registerAdapter('llm', ollamaAdapter);
```

### Advanced Features

#### Vector-Based Capability Caching

craft-a-tester includes a lightweight vector embedding system for caching test capabilities and results:

```typescript
import { CapabilityRegistry } from "@craftapit/tester";

const registry = new CapabilityRegistry({
  cachingEnabled: true,
  cacheFilePath: './.craft-a-tester/cache.json'
});

// Add the registry to your test executor
const executor = new TestExecutor({}, registry);
```

## License

MIT