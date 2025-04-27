# Simplified Craft-A-Tester Architecture

## Core Components

### 1. ScenarioParser
- Parses Given-When-Then test scenarios written in markdown
- Extracts test steps, context, and metadata
- Simplified to focus only on parsing, not code generation

### 2. TestRunner
- Executes test scenarios through appropriate adapters
- Coordinates test execution and result reporting
- No longer includes code generation or git workflow integration

### 3. Adapters
- API Adapter: For testing REST APIs
- Browser Adapter: For testing web UIs
- Database Adapter: For testing database interactions
- LLM Adapter: For natural language understanding of test steps

## Integration Points

### CraftACoder Integration
- Simple hook for passing test scenarios to craftacoder CLI
- Clear documentation on separation of concerns:
  - Craft-A-Tester: Executing natural language tests
  - CraftACoder: Code generation and improvement

## Removed Components

### Removed Code Generation Features
- TestGenerationAgent
- Language-specific code generators
- Git workflow integration

### Simplified Dependencies
- Focus on test execution dependencies
- Remove code generation and git-related dependencies

## Workflow

1. User writes test scenarios in Given-When-Then format
2. ScenarioParser parses the scenario
3. TestRunner executes the scenario using appropriate adapters
4. Results are reported back to the user
5. If code generation is needed, the scenario is passed to craftacoder CLI