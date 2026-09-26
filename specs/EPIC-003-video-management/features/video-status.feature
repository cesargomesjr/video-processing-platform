Feature: Video detail and status

  Scenario: Read an awaiting upload
    Given the authenticated user owns an AWAITING_UPLOAD video
    When the owner requests GET /videos/:id
    Then the current AWAITING_UPLOAD status is returned
    And progress is null

  Scenario: Read a queued video
    Given the authenticated user owns a confirmed PENDING video
    When the owner requests GET /videos/:id
    Then the current PENDING status is returned
    And the verified upload metadata is returned

  Scenario: Hide another user's video
    Given another user owns a video
    When the authenticated user requests that video detail
    Then the request is rejected with VIDEO_NOT_FOUND
