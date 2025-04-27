# Craft-A-Tester Parser Tests

## Context
- Type: Unit
- Environment: Development
- Testing: ScenarioParser

## Scenario: Parse Markdown Scenario Format

### Steps
1. **Given** I have a properly formatted markdown test scenario:
   ```markdown
   # Test Title

   ## Context
   - Type: API
   - Environment: Test

   ## Scenario: API Test

   ### Steps
   1. **Given** a precondition
   2. **When** an action is performed
   3. **Then** an expected outcome happens
   ```
2. **When** I parse this with ScenarioParser
3. **Then** the parser should extract a scenario object with the correct title "Test Title"
4. **And** the scenario object should have context information with Type="API"
5. **And** the scenario object should have exactly 3 steps
6. **And** the first step should have type "given" and instruction "a precondition"

## Scenario: Handle Multiple Scenarios in One File

### Steps
1. **Given** I have a markdown file with multiple scenarios:
   ```markdown
   # Multiple Scenarios Test

   ## Context
   - Type: API
   - Environment: Test

   ## Scenario: First Test

   ### Steps
   1. **Given** first test precondition
   2. **When** first test action
   3. **Then** first test outcome

   ## Scenario: Second Test

   ### Steps
   1. **Given** second test precondition
   2. **When** second test action
   3. **Then** second test outcome
   ```
2. **When** I parse this with ScenarioParser
3. **Then** the parser should extract two separate scenario objects
4. **And** the first scenario should have name "First Test"
5. **And** the second scenario should have name "Second Test"