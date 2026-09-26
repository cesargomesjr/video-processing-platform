Feature: Delivery quality gate

  Scenario: verification fails
    Given that one mandatory verification command fails
    When CI evaluates the change
    Then delivery should be blocked
