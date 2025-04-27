# TypedAPI Testing with Craft-a-Tester

## Overview

This addon provides specialized testing capabilities for TypedAPI contracts and implementations. It allows you to validate contracts, check request/response types, and test API endpoints against their contract definitions.

## Installation

```bash
npm install craft-a-tester-typedapi --save-dev
```

## Usage

### Register the Addon

```typescript
import { TestExecutor } from 'craft-a-tester';
import { TypedAPIAddon } from 'craft-a-tester-typedapi';

const executor = new TestExecutor();
executor.registerAddon(new TypedAPIAddon());
```

### Write TypedAPI Tests

Create markdown test files using the capabilities provided by the TypedAPI addon:

```markdown
# User API Contract Tests

## Context
- Type: TypedAPI
- ContractPath: ./shared/contracts/user.contracts.ts
- Endpoint: /api/users

## Scenario: Validate User Contract Structure

### Steps
1. **Given** the User contract 
2. **When** I validate the contract schema
3. **Then** all required fields should be present
4. **And** the contract should have valid request type
5. **And** the contract should have valid response type

## Scenario: Test User Creation Request

### Steps
1. **Given** the User Create contract
2. **When** I create a mock request with:
   ```json
   {
     "name": "Test User",
     "email": "test@example.com",
     "role": "user"
   }
   ```
3. **Then** the request should be valid against the contract
4. **And** no validation errors should be reported
```

## Capabilities

The TypedAPI addon provides the following capabilities:

### Contract Validation

- **validateContract**: Validates a TypedAPI contract against its schema
- **validateRequestType**: Checks that a request type is properly defined and valid
- **validateResponseType**: Checks that a response type is properly defined and valid

### Request/Response Testing

- **createMockRequest**: Creates a test request based on a contract
- **validateRequestAgainstContract**: Checks if a request matches its contract
- **validateResponseAgainstContract**: Checks if a response matches its contract

### Type Checking

- **checkTypeExistence**: Verifies that a specific type exists in the contract
- **checkTypeProperty**: Checks if a property exists on a type
- **compareTypes**: Compares two types for compatibility

## Configuration

Configure the TypedAPI addon by passing options during initialization:

```typescript
const typedAPIAddon = new TypedAPIAddon({
  // Base path for contract files
  contractsBasePath: './shared/contracts',
  
  // Validation options
  validation: {
    strictMode: true,
    ignoreExtraProperties: false,
  },
  
  // Mock options for request generation
  mock: {
    generateRealisticData: true,
    localeForData: 'en-US'
  }
});
```

## Integration with LLM Resolution

The TypedAPI addon is designed to work with the LLM-driven capability resolution system. The capabilities include natural language descriptions and examples that help the LLM correctly match test steps to the appropriate functionality.

For example, a test step like "Then the contract should have valid types" might be matched to the `validateContract` capability, even though the phrasing doesn't exactly match the capability name.

## Feedback System

The addon integrates with the Craft-a-Tester feedback system. After running tests, you can provide feedback on how well the LLM resolved capabilities:

```typescript
await executor.provideFeedback({
  stepId: "abc123",
  quality: "good",
  message: "Correctly identified contract validation"
});
```

This feedback helps improve future capability resolution accuracy.