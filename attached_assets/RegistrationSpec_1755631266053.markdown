# Specification for Registration Process with Acceptance of Platform Conditions

## 1. Overview
This specification outlines the behavior and requirements for the registration process of the Doktu platform, ensuring that all users must confirm their acceptance of the platform's conditions before completing registration. The specification is written using Gherkin syntax to define user stories and acceptance criteria, which will guide the development and testing of this feature.

## 2. Gherkin Stories

### Story 1: Successful Registration with Acceptance of Conditions
**As a new user**,  
**I want to register on the Doktu platform**,  
**so that I can access its services after agreeing to the platform's conditions.**

#### Scenario: User Registers with Valid Details and Accepts Conditions
```
Given I am on the Doktu registration page
And I have not yet registered
When I enter a valid first name "John"
And I enter a valid last name "Doe"
And I enter a valid email "john.doe@example.com"
And I enter a password with at least 6 characters "password123"
And I check the box to accept the platform conditions
And I click the "Create Account" button
Then I should be registered successfully
And I should see a confirmation message "Welcome to Doktu, John!"
And I should be redirected to my account dashboard
```

#### Scenario: User Attempts Registration Without Accepting Conditions
```
Given I am on the Doktu registration page
And I have not yet registered
When I enter a valid first name "John"
And I enter a valid last name "Doe"
And I enter a valid email "john.doe@example.com"
And I enter a password with at least 6 characters "password123"
And I do not check the box to accept the platform conditions
And I click the "Create Account" button
Then I should see an error message "Please accept the platform conditions to proceed"
And I should remain on the registration page
```

### Story 2: Edge Case - Invalid Input with Acceptance of Conditions
**As a new user**,  
**I want the registration process to handle invalid inputs gracefully**,  
**so that I receive clear feedback and can correct my mistakes while still needing to accept the conditions.**

#### Scenario: User Enters Invalid Email and Accepts Conditions
```
Given I am on the Doktu registration page
And I have not yet registered
When I enter a valid first name "John"
And I enter a valid last name "Doe"
And I enter an invalid email "john.doe"
And I enter a password with at least 6 characters "password123"
And I check the box to accept the platform conditions
And I click the "Create Account" button
Then I should see an error message "Please enter a valid email address"
And I should remain on the registration page
```

#### Scenario: User Enters Password Shorter Than 6 Characters and Accepts Conditions
```
Given I am on the Doktu registration page
And I have not yet registered
When I enter a valid first name "John"
And I enter a valid last name "Doe"
And I enter a valid email "john.doe@example.com"
And I enter a password with fewer than 6 characters "pass"
And I check the box to accept the platform conditions
And I click the "Create Account" button
Then I should see an error message "Password must be at least 6 characters"
And I should remain on the registration page
```

### Story 3: Existing User Attempting to Re-register
**As a system administrator**,  
**I want to prevent duplicate registrations**,  
**so that the platform maintains unique user accounts.**

#### Scenario: User Attempts to Register with an Existing Email
```
Given I am on the Doktu registration page
And an account already exists with the email "john.doe@example.com"
When I enter a valid first name "John"
And I enter a valid last name "Doe"
And I enter the existing email "john.doe@example.com"
And I enter a password with at least 6 characters "password123"
And I check the box to accept the platform conditions
And I click the "Create Account" button
Then I should see an error message "This email is already registered. Please sign in or use a different email"
And I should remain on the registration page
```

### Story 4: User Cancels Registration
**As a new user**,  
**I want to cancel the registration process**,  
**so that I can leave the page without committing to an account.**

#### Scenario: User Clicks "Sign In" Instead of Creating Account
```
Given I am on the Doktu registration page
And I have not yet registered
When I enter a valid first name "John"
And I enter a valid last name "Doe"
And I enter a valid email "john.doe@example.com"
And I enter a password with at least 6 characters "password123"
And I check the box to accept the platform conditions
And I click the "Already have an account? Sign in" link
Then I should be redirected to the login page
And my entered data should not be saved
```

## 3. Additional Notes
- The "platform conditions" should be linked to a terms of service page accessible via a hyperlink next to the acceptance checkbox.
- All error messages should be user-friendly and provide clear instructions for resolution.
- The registration process should be secure, with password input masked and data transmitted over HTTPS.

This specification ensures that the registration process enforces acceptance of platform conditions while handling various user scenarios effectively.