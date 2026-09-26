Feature: Video status

  Scenario: processing video
    Given that a video is being processed
    When the owner requests video details
    Then the current processing status should be returned
    And progress should be returned when available
