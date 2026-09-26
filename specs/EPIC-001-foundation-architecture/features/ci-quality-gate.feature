Feature: CI quality gate

  Scenario: coverage is below threshold
    Given that project coverage is below 80 percent
    When CI executes the quality gate
    Then the pipeline should fail
