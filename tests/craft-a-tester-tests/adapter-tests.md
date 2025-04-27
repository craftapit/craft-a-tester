# Craft-A-Tester Adapter Tests

## Context
- Type: Integration
- Environment: Development
- Testing: Adapter integration with TestExecutor

## Scenario: OllamaAdapter Integration Test

### Steps
1. **Given** I have initialized the TestExecutor with an OllamaAdapter
2. **When** I send a simple prompt to the adapter
   ```typescript
   const result = await adapter.complete("What is TypeScript?");
   ```
3. **Then** I should receive a non-empty response
4. **And** The response should contain information about TypeScript

## Scenario: APIAdapter Integration Test

### Steps
1. **Given** I have initialized the TestExecutor with an APIAdapter
2. **When** I send a GET request to a public API
   ```typescript
   const response = await adapter.makeRequest({
     method: 'GET',
     url: 'https://jsonplaceholder.typicode.com/todos/1'
   });
   ```
3. **Then** I should receive a successful status code (200)
4. **And** The response body should contain the expected data structure
5. **And** The response body should have properties like "id" and "title"