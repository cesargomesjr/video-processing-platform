Feature: Video listing

  Scenario: list own videos
    Given that the user owns multiple videos
    When the user lists videos
    Then only videos owned by that user should be returned
