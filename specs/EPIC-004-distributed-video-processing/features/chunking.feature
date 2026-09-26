Feature: Temporal chunk scheduling

  Scenario: long video
    Given that a video duration requires multiple chunks
    When the orchestrator schedules processing
    Then deterministic non-overlapping chunks should be created
