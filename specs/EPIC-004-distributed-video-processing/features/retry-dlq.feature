Feature: Retry and DLQ

  Scenario: repeated transient failure
    Given that processing continues to fail
    When max attempts is exceeded
    Then the job should be routed to the DLQ
    And the processing state should reflect a definitive failure
