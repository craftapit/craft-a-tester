# Craft-A-Tester Executor Tests

## Context
- Type: Integration
- Environment: Development
- Testing: TestExecutor

## Scenario: Execute Simple Test with LLM

### Steps
1. **Given** I have initialized a TestExecutor with an LLM adapter
2. **When** I run a simple test scenario:
   ```markdown
   # Simple Test
   
   ## Scenario: Basic Test
   
   ### Steps
   1. **Given** a precondition
   2. **When** an action
   3. **Then** an outcome
   ```
3. **Then** the executor should complete all steps successfully
4. **And** the executor should return a successful test result
5. **And** the test result should contain step execution details

## Scenario: Handle Test Step Failures

### Steps
1. **Given** I have initialized a TestExecutor with an LLM adapter
2. **When** I run a test scenario with an impossible expectation:
   ```markdown
   # Failure Test
   
   ## Scenario: Failed Expectation
   
   ### Steps
   1. **Given** a precondition
   2. **When** an action
   3. **Then** an impossible outcome that can't be true
   ```
3. **Then** the executor should identify the failed step
4. **And** the test result should contain information about the failure
5. **And** the test result should mark the overall scenario as failed