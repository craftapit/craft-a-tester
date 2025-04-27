# Login Test

## Context
- Environment: Test

## Scenario: Successful Login

### Steps

1. **Given** I am on the login page
2. **When** I enter valid credentials
   - Username: test@example.com
   - Password: password123
3. **When** I click the login button
4. **Then** I should be redirected to the dashboard
5. **And** I should see a welcome message
