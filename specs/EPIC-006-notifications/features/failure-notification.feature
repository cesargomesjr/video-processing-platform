Feature: Failure notification

  Scenario: definitive processing failure
    Given that a video processing failure is definitive
    When the failure event is consumed
    Then the user should receive a failure notification
