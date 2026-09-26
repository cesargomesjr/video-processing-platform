Feature: Local identity provisioning

  Scenario: provision an authenticated Firebase user
    Given Firebase Authentication issued a valid ID Token
    And no local user exists for the token uid
    When the user requests PUT /auth/me with that token
    Then one local user should be created
    And the response should contain the internal id and firebaseUid
