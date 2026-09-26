Feature: Processing observability

  Scenario: chunk completes
    Given that a worker is processing a chunk
    When the chunk completes
    Then structured logs should include correlation identifiers
    And processing metrics should be updated
