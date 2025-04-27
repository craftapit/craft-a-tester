# User API Test

## Context
- Type: API
- Environment: Test
- BaseURL: https://jsonplaceholder.typicode.com

## Scenario: Fetch User Data

### Steps

1. **Given** the API is available
2. **When** I send a GET request to "/users/1"
3. **Then** the response status should be 200
4. **And** the response body should contain:
   - id: 1
   - name: "Leanne Graham"
4. **When** I send a POST request to "/posts" with body:
   {
     "title": "Test Post",
     "body": "This is a test post",
     "userId": 1
   }
5. **Then** the response status should be 201
6. **And** the response body should contain:
   - title: "Test Post"
   - body: "This is a test post"
