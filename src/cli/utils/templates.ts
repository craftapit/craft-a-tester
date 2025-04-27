export async function getTemplateContent(templateName: string): Promise<string> {
  switch (templateName) {
    case 'ui-example':
      return `# Login Test

## Context
- Type: UI
- Environment: Test
- URL: https://example.com/login

## Scenario: Successful Login

### Steps

1. **Given** I am on the login page
2. **When** I enter "testuser" in the username field
3. **And** I enter "password123" in the password field
4. **And** I click the "Log In" button
5. **Then** I should be redirected to the dashboard
6. **And** I should see a welcome message with the username "testuser"
`;
    
    case 'api-example':
      return `# User API Test

## Context
- Type: API
- Environment: Test
- BaseURL: https://api.example.com

## Scenario: Fetch User Data

### Steps

1. **Given** the API is available
2. **When** I send a GET request to "/users/1"
3. **Then** the response status should be 200
4. **And** the response body should contain:
   - id: 1
   - name: "Test User"
5. **When** I send a POST request to "/users" with body:
   {
     "name": "New User",
     "email": "newuser@example.com"
   }
6. **Then** the response status should be 201
7. **And** the response body should contain:
   - name: "New User"
   - email: "newuser@example.com"
`;
    
    case 'db-example':
      return `# Database User Management Test

## Context
- Type: Database
- Environment: Test
- Database: SQLite

## Scenario: Create and Query User

### Steps

1. **Given** a clean database with the users table
2. **When** I execute the SQL query:
   \`\`\`sql
   INSERT INTO users (id, name, email, created_at) 
   VALUES (1, 'John Doe', 'john@example.com', datetime('now'))
   \`\`\`
3. **Then** the query should affect 1 row
4. **When** I execute the SQL query:
   \`\`\`sql
   SELECT * FROM users WHERE id = 1
   \`\`\`
5. **Then** the result should contain 1 row
6. **And** the row should have:
   - name: "John Doe"
   - email: "john@example.com"
7. **When** I execute the SQL query:
   \`\`\sql
   UPDATE users SET name = 'Jane Doe' WHERE id = 1
   \`\`\`
8. **Then** the query should affect 1 row
9. **When** I execute the SQL query:
   \`\`\`sql
   SELECT name FROM users WHERE id = 1
   \`\`\`
10. **Then** the result should contain:
    - name: "Jane Doe"
`;
    
    default:
      throw new Error(`Unknown template: ${templateName}`);
  }
}