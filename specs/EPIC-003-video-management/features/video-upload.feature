Feature: Video upload creation

  Scenario: Create a valid signed upload
    Given the user is authenticated
    And the user provides a supported filename, content type and size
    When the user requests POST /videos
    Then a video owned by the authenticated user is created as AWAITING_UPLOAD
    And temporary signed PUT instructions are returned
    And the original file does not pass through the API

  Scenario: Reject unsupported media metadata
    Given the user is authenticated
    And the declared content type does not match a supported filename extension
    When the user requests POST /videos
    Then the request is rejected
    And no video resource is persisted
    And no signed upload instruction is issued

  Scenario: Reject a video above the configured size
    Given the user is authenticated
    And the declared size exceeds VIDEO_UPLOAD_MAX_BYTES
    When the user requests POST /videos
    Then the request is rejected with VIDEO_TOO_LARGE
    And no video resource is persisted
