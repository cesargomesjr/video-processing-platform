Feature: Video listing

  Scenario: List only owned videos
    Given two authenticated users own different videos
    When one user requests GET /videos
    Then only videos owned by that user are returned
    And no foreign video metadata is disclosed

  Scenario: Continue a stable paginated listing
    Given the authenticated user owns more videos than the requested limit
    And some videos share the same creation timestamp
    When the user follows the returned next cursor
    Then the next page preserves createdAt and id descending order
    And no video is repeated between the pages

  Scenario: Reject an invalid cursor
    Given the user is authenticated
    When the user lists videos with a malformed cursor
    Then the request is rejected with INVALID_CURSOR
