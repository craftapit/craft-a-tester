# API Login Flow Test

## Context
- Type: API
- Environment: Test
- BaseURL: https://api.example.com

## Scenario: User Login Flow

### Steps

1. **Given** the API is available
2. **When** I send a POST request to "/auth/login" with body:
   {
     "email": "test@example.com",
     "password": "securePassword123"
   }
3. **Then** the response status should be 200
4. **And** the response body should contain:
   - token: String
   - userId: Number
5. **When** I send a GET request to "/users/profile" with the received token in Authorization header
6. **Then** the response status should be 200
7. **And** the response body should contain:
   - email: "test@example.com"
8. **When** I send a POST request to "/auth/logout" with the token
9. **Then** the response status should be 200