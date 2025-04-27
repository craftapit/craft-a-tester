# craft-a-tester Examples

This document provides real-world examples of test scenarios for different types of applications.

## API Testing Examples

### Authentication Flow

```markdown
# Authentication API Tests

## Context
- Type: API
- Environment: Test
- BaseURL: http://localhost:3000

## Scenario: User Registration and Login

### Steps

1. **Given** the API is available
2. **When** I send a POST request to "/auth/register" with body:
   {
     "email": "test@example.com",
     "password": "SecurePass123!",
     "name": "Test User"
   }
3. **Then** the response status should be 201
4. **And** the response body should contain:
   - message: "User registered successfully"
5. **When** I send a POST request to "/auth/login" with body:
   {
     "email": "test@example.com",
     "password": "SecurePass123!"
   }
6. **Then** the response status should be 200
7. **And** the response body should contain:
   - token: <string>
   - userId: <string>
8. **And** I store the response body token as {authToken}
9. **When** I send a GET request to "/auth/me" with headers:
   {
     "Authorization": "Bearer {authToken}"
   }
10. **Then** the response status should be 200
11. **And** the response body should contain:
    - email: "test@example.com"
    - name: "Test User"
```

### CRUD Operations

```markdown
# Product API Tests

## Context
- Type: API
- Environment: Test
- BaseURL: http://localhost:3000

## Scenario: Product CRUD Operations

### Steps

1. **Given** I am authenticated as an admin user
2. **When** I send a POST request to "/api/products" with body:
   {
     "name": "Test Product",
     "price": 99.99,
     "description": "This is a test product",
     "category": "electronics"
   }
3. **Then** the response status should be 201
4. **And** the response body should contain:
   - id: <string>
   - name: "Test Product"
   - price: 99.99
5. **And** I store the response body id as {productId}
6. **When** I send a GET request to "/api/products/{productId}"
7. **Then** the response status should be 200
8. **And** the response body should contain:
   - name: "Test Product"
   - price: 99.99
9. **When** I send a PUT request to "/api/products/{productId}" with body:
   {
     "name": "Updated Product",
     "price": 129.99,
     "description": "This is an updated test product",
     "category": "electronics"
   }
10. **Then** the response status should be 200
11. **And** the response body should contain:
    - name: "Updated Product"
    - price: 129.99
12. **When** I send a DELETE request to "/api/products/{productId}"
13. **Then** the response status should be 204
14. **When** I send a GET request to "/api/products/{productId}"
15. **Then** the response status should be 404
```

## Database Testing Examples

### User Data Management

```markdown
# User Database Tests

## Context
- Type: Database
- Environment: Test
- Database: PostgreSQL

## Scenario: User Record Management

### Steps

1. **Given** the database is connected
2. **When** I execute the query:
   ```sql
   INSERT INTO users (name, email, created_at) 
   VALUES ('Jane Doe', 'jane@example.com', NOW())
   RETURNING id
   ```
3. **Then** the query should affect 1 row
4. **And** I store the first result column of the first row as {userId}
5. **When** I execute the query:
   ```sql
   SELECT * FROM users WHERE id = {userId}
   ```
6. **Then** the result should have 1 row
7. **And** the result should contain a user with:
   - name: "Jane Doe"
   - email: "jane@example.com"
8. **When** I execute the query:
   ```sql
   UPDATE users SET name = 'Jane Smith' WHERE id = {userId}
   ```
9. **Then** the query should affect 1 row
10. **When** I execute the query:
    ```sql
    SELECT name FROM users WHERE id = {userId}
    ```
11. **Then** the result first row should contain:
    - name: "Jane Smith"
12. **When** I execute the query:
    ```sql
    DELETE FROM users WHERE id = {userId}
    ```
13. **Then** the query should affect 1 row
```

## Subscription and Billing Tests

### Subscription Lifecycle

```markdown
# Subscription Management Tests

## Context
- Type: API
- Environment: Test
- BaseURL: http://localhost:3000

## Scenario: Subscription Lifecycle

### Steps

1. **Given** I am authenticated as a user
2. **When** I send a GET request to "/api/subscription-plans"
3. **Then** the response status should be 200
4. **And** the response body should contain an array of subscription plans
5. **And** I store the first plan id as {planId}
6. **When** I send a POST request to "/api/subscriptions" with body:
   {
     "planId": "{planId}",
     "paymentMethodId": "pm_card_visa"
   }
7. **Then** the response status should be 201
8. **And** the response body should contain:
   - id: <string>
   - status: "active"
   - currentPeriodEnd: <date>
9. **And** I store the response body id as {subscriptionId}
10. **When** I send a GET request to "/api/subscriptions/{subscriptionId}"
11. **Then** the response status should be 200
12. **And** the response body should contain:
    - planId: "{planId}"
    - status: "active"
13. **When** I send a PUT request to "/api/subscriptions/{subscriptionId}" with body:
    {
      "cancelAtPeriodEnd": true
    }
14. **Then** the response status should be 200
15. **And** the response body should contain:
    - cancelAtPeriodEnd: true
16. **When** I send a GET request to "/api/subscriptions/{subscriptionId}/invoices"
17. **Then** the response status should be 200
18. **And** the response body should contain an array of invoices
```

## Browser Testing Examples

### E-commerce Shopping Flow

```markdown
# E-commerce Shopping Flow Test

## Context
- Type: Browser
- Environment: Test
- BaseURL: http://localhost:8080

## Scenario: Add Product to Cart and Checkout

### Steps

1. **Given** I am on the homepage
2. **When** I click on the "Products" link
3. **Then** I should see a list of products
4. **When** I click on the first product
5. **Then** I should see the product details page
6. **When** I click the "Add to Cart" button
7. **Then** I should see a notification "Product added to cart"
8. **When** I click on the "Cart" icon
9. **Then** I should see the shopping cart page
10. **And** I should see 1 item in the cart
11. **When** I click the "Proceed to Checkout" button
12. **Then** I should see the checkout page
13. **When** I fill the form:
    - firstName: "John"
    - lastName: "Doe"
    - email: "john@example.com"
    - address: "123 Test St"
    - city: "Test City"
    - zipCode: "12345"
    - country: "United States"
14. **And** I click the "Continue to Payment" button
15. **Then** I should see the payment form
16. **When** I fill the payment form:
    - cardNumber: "4242424242424242"
    - expiry: "12/25"
    - cvc: "123"
17. **And** I click the "Complete Order" button
18. **Then** I should see the order confirmation page
19. **And** I should see text containing "Thank you for your order"
```

## Advanced Examples

### Testing with Data Validation

```markdown
# User Data Validation Tests

## Context
- Type: API
- Environment: Test
- BaseURL: http://localhost:3000

## Scenario: User Registration with Validation

### Steps

1. **Given** the API is available
2. **When** I send a POST request to "/auth/register" with body:
   {
     "email": "invalid-email",
     "password": "short",
     "name": ""
   }
3. **Then** the response status should be 400
4. **And** the response body should contain:
   - errors: <array>
5. **And** the response body errors should contain items with:
   - field: "email"
   - message: <string>
6. **And** the response body errors should contain items with:
   - field: "password"
   - message: <string>
7. **And** the response body errors should contain items with:
   - field: "name"
   - message: <string>
8. **When** I send a POST request to "/auth/register" with body:
   {
     "email": "test@example.com",
     "password": "SecurePass123!",
     "name": "Test User"
   }
9. **Then** the response status should be 201
```

### Complex Business Rules Testing

```markdown
# Order Pricing and Discount Tests

## Context
- Type: API
- Environment: Test
- BaseURL: http://localhost:3000

## Scenario: Order with Multiple Discounts

### Steps

1. **Given** I am authenticated as a user
2. **When** I send a POST request to "/api/cart" with body:
   {
     "items": [
       {
         "productId": "prod_1",
         "quantity": 2
       },
       {
         "productId": "prod_2",
         "quantity": 1
       }
     ]
   }
3. **Then** the response status should be 201
4. **And** the response body should contain:
   - subtotal: 299.97
   - items: <array>
5. **When** I send a POST request to "/api/cart/promo" with body:
   {
     "code": "SAVE10"
   }
6. **Then** the response status should be 200
7. **And** the response body should contain:
   - subtotal: 299.97
   - discount: 30.00
   - total: 269.97
8. **When** I send a POST request to "/api/orders" with body:
   {
     "shippingAddress": {
       "street": "123 Test St",
       "city": "Test City",
       "zipCode": "12345",
       "country": "United States"
     },
     "paymentMethodId": "pm_card_visa"
   }
9. **Then** the response status should be 201
10. **And** the response body should contain:
    - orderId: <string>
    - status: "paid"
    - total: 269.97
11. **And** the total should be equal to the subtotal minus the discount
```

These examples showcase different testing scenarios that can be implemented using craft-a-tester. You can adapt them to fit your specific application needs.