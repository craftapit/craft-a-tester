# craft-a-tester Usage Guide

This document provides detailed guidance on using craft-a-tester in your project.

## Installation

```bash
# Install globally
npm install -g craft-a-tester

# Or install in your project
npm install --save-dev craft-a-tester
```

## CLI Usage

craft-a-tester provides a command-line interface for running test scenarios:

```bash
# Run a single test scenario
craft-a-tester run ./tests/scenarios/login-test.md

# Run all scenarios in a directory
craft-a-tester run-all ./tests/scenarios

# Run all scenarios in a directory and subdirectories
craft-a-tester run-all ./tests/scenarios --recursive

# Specify a configuration file
craft-a-tester run ./tests/scenarios/login-test.md --config ./craft-a-tester.json
```

### Command Options

#### `run` Command
```
craft-a-tester run <scenarioPath> [options]
```

Options:
- `--config, -c`: Path to configuration file (default: `./craft-a-tester.json`)
- `--output, -o`: Path to output results (default: `./test-results`)
- `--format, -f`: Output format: json, html, or text (default: `json`)
- `--verbose, -v`: Enable verbose output
- `--only <scenario>`: Run only a specific scenario from the file

#### `run-all` Command
```
craft-a-tester run-all <directoryPath> [options]
```

Options:
- `--config, -c`: Path to configuration file (default: `./craft-a-tester.json`)
- `--output, -o`: Path to output results (default: `./test-results`)
- `--format, -f`: Output format: json, html, or text (default: `json`)
- `--verbose, -v`: Enable verbose output
- `--recursive, -r`: Recursively search for test files in subdirectories
- `--pattern, -p`: File pattern to match (default: `*.md`)
- `--skip <pattern>`: Skip files matching the pattern

## NPM Scripts Integration

Add craft-a-tester to your npm scripts in `package.json`:

```json
{
  "scripts": {
    "test:scenarios": "craft-a-tester run-all ./tests/scenarios --config ./craft-a-tester.json",
    "test:scenario": "craft-a-tester run"
  }
}
```

Usage:
```bash
# Run all scenarios
npm run test:scenarios

# Run a specific scenario
npm run test:scenario -- ./tests/scenarios/login-test.md
```

## Configuration

craft-a-tester uses a JSON configuration file to control test execution:

```json
{
  "environment": "test",
  
  "api": {
    "baseUrl": "http://localhost:3000",
    "timeout": 10000,
    "headers": {
      "Content-Type": "application/json"
    }
  },
  
  "auth": {
    "enabled": true,
    "endpoint": "/auth/login",
    "method": "POST",
    "credentials": {
      "email": "test@example.com",
      "password": "password123"
    },
    "tokenPath": "token"
  },
  
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-haiku-20240307"
  },
  
  "database": {
    "enabled": false
  },
  
  "reporting": {
    "outputDir": "./test-results",
    "format": "json",
    "includeFullResults": true,
    "consoleOutput": true
  },
  
  "execution": {
    "parallel": false,
    "stopOnFailure": false,
    "retries": 1,
    "timeout": 30000
  }
}
```

### LLM Provider Configuration

#### Anthropic
```json
"llm": {
  "provider": "anthropic",
  "model": "claude-3-haiku-20240307",
  "apiKey": "your-api-key-here"
}
```

#### OpenAI
```json
"llm": {
  "provider": "openai",
  "model": "gpt-4",
  "apiKey": "your-api-key-here"
}
```

#### Ollama (local inference)
```json
"llm": {
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "model": "llama3:8b",
  "contextSize": 16384,
  "dynamicContextSizing": true
}
```

## Environment Variables

craft-a-tester supports the following environment variables:

- `LLM_PROVIDER`: Override the LLM provider (`anthropic`, `openai`, or `ollama`)
- `LLM_MODEL`: Override the LLM model
- `ANTHROPIC_API_KEY`: Anthropic API key
- `OPENAI_API_KEY`: OpenAI API key
- `OLLAMA_BASE_URL`: Ollama server URL
- `OLLAMA_MODEL`: Ollama model to use
- `CRAFT_A_TESTER_CONFIG`: Path to configuration file
- `CRAFT_A_TESTER_OUTPUT`: Path to output directory
- `CRAFT_A_TESTER_VERBOSE`: Enable verbose output

You can use a `.env` file with `dotenv` for local development:

```
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3:8b
ANTHROPIC_API_KEY=your_api_key_here
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

### Context Properties

- `Type`: Test type (API, Browser, Database)
- `Environment`: Test environment (Test, Dev, Prod)
- `BaseURL`: Base URL for API tests
- `Database`: Database connection for database tests
- `Browser`: Browser settings for browser tests

### Step Types

- `Given`: Set up preconditions
- `When`: Perform actions
- `Then`: Assert outcomes
- `And`: Additional assertions or actions

### Variables and References

You can use variables to store and reference values between steps:

```markdown
1. **When** I send a POST request to "/auth/login" with body:
   {
     "username": "testuser",
     "password": "password123"
   }
2. **Then** the response status should be 200
3. **And** I store the response body token as {authToken}
4. **When** I send a GET request to "/api/profile" with headers:
   {
     "Authorization": "Bearer {authToken}"
   }
```

## Project Organization

Recommended structure for craft-a-tester tests:

```
project/
├── tests/
│   ├── scenarios/           # Test scenarios
│   │   ├── auth/
│   │   │   ├── login.md
│   │   │   └── register.md
│   │   ├── api/
│   │   │   ├── users.md
│   │   │   └── products.md
│   │   └── README.md        # Documentation for scenarios
│   └── README.md            # General testing documentation
├── craft-a-tester.json      # Configuration file
└── package.json             # NPM scripts
```

## Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Run API Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      api:
        image: your-api-image
        ports:
          - 3000:3000
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run API scenarios
      run: npm run test:scenarios
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Troubleshooting

### Common Issues

1. **Error: Cannot find module 'craft-a-tester'**
   - Make sure craft-a-tester is installed correctly
   - Check the `node_modules` path

2. **LLM provider not working**
   - Verify API keys are set correctly
   - Check network connectivity to the LLM provider
   - For Ollama, ensure the service is running

3. **Tests failing with API errors**
   - Verify the API is running and accessible
   - Check the base URL configuration
   - Ensure authentication credentials are correct

4. **Parsing errors in test scenarios**
   - Check markdown format and syntax
   - Verify JSON in request bodies is valid
   - Make sure indentation is consistent

### Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
craft-a-tester run ./tests/scenarios/login-test.md --verbose
```

Or using environment variables:

```bash
CRAFT_A_TESTER_VERBOSE=true npm run test:scenarios
```