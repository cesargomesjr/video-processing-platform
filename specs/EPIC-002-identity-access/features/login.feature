Feature: User login

  Scenario: valid credentials
    Given that a user is registered
    When valid credentials are submitted
    Then an access credential should be issued
