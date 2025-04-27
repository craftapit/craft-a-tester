# Scenario Parser Tests

## Context
- Type: Unit
- Target: ScenarioParser
- Environment: Development
- Self-Test: This test validates craft-a-tester's own functionality

## Scenario: Parse a basic scenario with simple steps

### Steps
1. **Given** I have a test scenario in markdown format:
   ```markdown
   # Simple Test
   
   ## Context
   - Type: API
   - BaseURL: https://example.com
   
   ## Scenario: Basic API Test
   
   ### Steps
   1. **Given** the API is available
   2. **When** I send a GET request to "/users"
   3. **Then** the response status should be 200
   ```
2. **When** I parse this scenario with ScenarioParser
3. **Then** the parser should extract the title as "Simple Test"
4. **And** the context should include BaseURL as "https://example.com"
5. **And** the scenario name should be "Basic API Test"
6. **And** there should be 3 steps extracted

## Scenario: Parse a scenario with complex step parameters

### Steps
1. **Given** I have a test scenario with JSON parameters:
   ```markdown
   # Complex Parameter Test
   
   ## Context
   - Type: API
   - BaseURL: https://example.com
   
   ## Scenario: Parameter Test
   
   ### Steps
   1. **Given** the API is available
   2. **When** I send a POST request to "/users" with body:
      {
        "name": "Test User",
        "email": "test@example.com",
        "roles": ["user", "admin"]
      }
   3. **Then** the response status should be 201
   4. **And** the response body should contain:
      - id: Number
      - name: "Test User"
   ```
2. **When** I parse this scenario with ScenarioParser
3. **Then** the parser should correctly extract the JSON body from step 2
4. **And** the JSON should maintain its structure with nested objects and arrays
5. **And** the parser should extract the expected response fields from step 4

## Scenario: Handle multi-scenario markdown files

### Steps
1. **Given** I have a markdown file with multiple scenarios:
   ```markdown
   # Multi-Scenario Test
   
   ## Context
   - Type: API
   - BaseURL: https://example.com
   
   ## Scenario: First Test
   
   ### Steps
   1. **Given** the API is available
   2. **When** I send a GET request to "/users"
   3. **Then** the response status should be 200
   
   ## Scenario: Second Test
   
   ### Steps
   1. **Given** the API is available
   2. **When** I send a GET request to "/products"
   3. **Then** the response status should be 200
   ```
2. **When** I parse this file with ScenarioParser
3. **Then** the parser should extract two separate scenarios
4. **And** the first scenario should have steps related to "/users"
5. **And** the second scenario should have steps related to "/products"