Feature: Firebase authenticated access

  Scenario: valid Firebase ID Token
    Given the user authenticated with email and password in Firebase
    When a protected API route receives the Firebase ID Token
    Then the request should have an authenticated local UserId

  Scenario: invalid Firebase ID Token
    Given the request has an invalid or expired token
    When a protected API route is requested
    Then the API should respond with 401
