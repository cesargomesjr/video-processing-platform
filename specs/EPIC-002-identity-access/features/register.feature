Feature: User registration

  Scenario: valid registration
    Given that the email is not registered
    When the user submits a valid email and password
    Then the user should be created
    And the password should not be stored in plain text
