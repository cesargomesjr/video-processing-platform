Feature: Resource ownership

  Scenario: access another user's resource
    Given that a user is authenticated
    And the requested resource belongs to another user
    When the resource is requested
    Then access should be denied
