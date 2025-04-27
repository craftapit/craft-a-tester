# User Database Test

## Context
- Type: Database
- Environment: Test
- Database: PostgreSQL

## Scenario: User CRUD Operations

### Steps

1. **Given** the database is connected
2. **When** I execute the query "SELECT * FROM users WHERE id = 1"
3. **Then** the result should have 1 row
4. **And** the result should contain a user with name "John Doe"
5. **When** I execute the query "INSERT INTO users (name, email) VALUES ('Test User', 'test@example.com')"
6. **Then** the query should affect 1 row
7. **When** I execute the query "SELECT * FROM users WHERE email = 'test@example.com'"
8. **Then** the result should contain a user with name "Test User"
