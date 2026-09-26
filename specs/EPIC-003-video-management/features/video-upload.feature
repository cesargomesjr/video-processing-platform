Feature: Video upload

  Scenario: create a valid upload
    Given that the user is authenticated
    When the user requests a video upload
    Then a video resource should be created
    And a secure upload mechanism should be returned
