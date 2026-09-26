Feature: Video analysis

  Scenario: valid uploaded video
    Given that a video upload was completed
    When the analyzer processes the video
    Then video metadata should be extracted
    And the video should become ready for chunk scheduling
