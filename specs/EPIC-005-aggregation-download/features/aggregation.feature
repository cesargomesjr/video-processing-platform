Feature: Video aggregation

  Scenario: last chunk completes
    Given that every video chunk is completed
    When fan-in evaluates the video
    Then exactly one aggregation should start
    And the final ZIP should be stored
