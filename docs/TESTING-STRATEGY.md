# Testing Strategy

## Overview

This document outlines the testing strategy for the CraftAPIT ecosystem, utilizing the craft-a-tester framework for natural language testing across all projects within the monorepo structure.

## Philosophy

Our testing approach is built on several core principles:

1. **Natural Language Testing**: Tests are written in human-readable language that both technical and non-technical stakeholders can understand.

2. **Multi-Layer Testing**: Tests can target multiple layers of the application stack (UI, API, Database) in the same scenario.

3. **Consistent Structure**: Tests follow a consistent Given-When-Then pattern across all projects.

4. **Environment Awareness**: Tests adapt to the environment they're running in (development, test, production).

5. **AI-Assisted**: The framework bridges the gap between natural language specifications and technical implementation.

## Test Categories

### 1. Unit Tests

- Focus on individual components in isolation
- Should be fast and deterministic
- Extensive use of mocks and stubs

### 2. Integration Tests

- Test interaction between components
- May involve multiple services
- Limited external dependencies

### 3. API Contract Tests

- Verify API behavior matches specifications
- Enforce type safety and schema validation
- Cover error cases and edge conditions

### 4. End-to-End Tests

- Test complete user journeys
- May span multiple services and UIs
- Focus on the user experience

### 5. Security Tests

- Verify access controls
- Test for common vulnerabilities
- Validate data protection measures

## Repository Structure

```
monorepo/
├── craft-a-tester/         # The test framework itself
│   ├── tests/              # Self-tests for the framework
│
├── typedapi/               
│   └── tests/              # Tests FOR TypedAPI
│
├── api/                    
│   └── tests/              # Tests FOR API
│
├── web/                    
│   └── tests/              # Tests FOR Web
│
└── tests/                  # Monorepo integration tests
    ├── api-typedapi/       # Cross-component tests
    ├── web-api/            
    └── end-to-end/         
```

## Test Format

Tests are written in markdown using the following structure:

```markdown
# Test Title

## Context
- Type: [Unit|Integration|API|E2E]
- Environment: [Development|Test|Production]
- [Additional context]

## Scenario: [Descriptive Scenario Name]

### Steps
1. **Given** [precondition]
2. **When** [action]
3. **Then** [expected result]
4. **And** [additional expectation]
```

## Layer-Specific Testing

### UI Layer

- Focus on user interactions
- Test responsive behavior
- Verify visual elements

### API Layer

- Verify request/response patterns
- Test authentication and authorization
- Validate error handling

### Database Layer

- Test data persistence
- Verify data relationships
- Test transactions and rollbacks

## Test Execution Environments

### 1. Docker-based Local Environment

- Isolated testing environment
- Fast feedback loop
- Suitable for development and CI

### 2. Dedicated Test Environment

- Mirrors production configuration
- Integration with external services
- More thorough testing

### 3. Production Environment (Smoke Tests)

- Limited, non-destructive tests
- Focus on availability and core functionality
- Use synthetic test accounts

## Implementation With craft-a-tester

The craft-a-tester framework translates natural language test specifications into executable test code:

1. **Parsing**: Natural language parsed into structured test steps
2. **Execution**: Steps mapped to technical implementations
3. **Reporting**: Results presented in relation to original specifications

## TDD Workflow

1. Write test scenario in natural language
2. Run test (which will fail)
3. Implement code to make test pass
4. Refactor while ensuring tests still pass
5. Repeat

## Future Enhancements

- Visual test reporting
- AI-powered test generation
- Performance testing integration
- Accessibility testing