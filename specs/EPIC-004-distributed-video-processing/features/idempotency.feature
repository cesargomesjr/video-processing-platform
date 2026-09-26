Feature: Idempotent chunk processing

  Scenario: duplicate chunk message
    Given that a chunk is already completed
    When the same processing job is delivered again
    Then the chunk should not be processed again
