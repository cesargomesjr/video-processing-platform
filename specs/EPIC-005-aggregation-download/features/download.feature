Feature: Download completed result

  Scenario: owner requests result
    Given that the video is completed
    And the authenticated user owns the video
    When the result is requested
    Then a temporary download URL should be returned
