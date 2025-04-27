# Framework Self-Test

## Context
- Environment: Development
- LLM: Anthropic Claude

## Scenario: Parsing a Simple Test Scenario

### Steps

1. **Given** I have a simple test scenario file
2. **When** I parse the scenario using ScenarioParser
3. **Then** I should get the correct title
4. **And** I should get the correct context information
5. **And** I should get the correct steps

## Scenario: Running a Basic Test

### Steps

1. **Given** I have initialized the TestRunner
2. **When** I run a simple test scenario
3. **Then** The scenario should execute successfully
4. **And** I should receive a valid test result
