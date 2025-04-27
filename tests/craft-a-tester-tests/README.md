# Craft-A-Tester Tests

This directory contains tests for the craft-a-tester framework itself, written using its own testing format.

## Test Categories

- **Adapter Tests**: Tests for the various adapters (Ollama, API, Database)
- **Parser Tests**: Tests for the ScenarioParser functionality
- **Executor Tests**: Tests for the TestExecutor 

## Running Tests

To run these tests:

```bash
# Run all craft-a-tester tests
npm run test:craft-a-tester

# Run with a specific model
OLLAMA_MODEL="phi4:14b-fp16" npm run test:craft-a-tester
```

## Test Contents

### Adapter Tests

Tests for the adapters used to interact with various systems:

- **OllamaAdapter**: Integration with Ollama API
- **APIAdapter**: Making HTTP requests to external APIs

### Parser Tests

Tests for the markdown parsing functionality:

- **Scenario Parsing**: Extracting information from markdown
- **Multiple Scenarios**: Handling files with multiple test scenarios

### Executor Tests

Tests for the test execution engine:

- **Simple Test Execution**: Running basic test scenarios
- **Failure Handling**: Managing test failures appropriately