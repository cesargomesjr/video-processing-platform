Feature: Video upload confirmation

  Scenario: Confirm a valid uploaded object
    Given the authenticated user owns an AWAITING_UPLOAD video
    And the expected private object exists with matching metadata
    When the owner confirms the upload
    Then the video becomes PENDING
    And exactly one VideoUploaded.v1 intent is committed atomically

  Scenario: Retry an already confirmed upload
    Given the authenticated user owns a video that is already PENDING
    When the owner confirms the upload again
    Then the request succeeds with the current status
    And no additional VideoUploaded.v1 intent is created

  Scenario: Reject confirmation when the object is missing
    Given the authenticated user owns an AWAITING_UPLOAD video
    And the expected object does not exist
    When the owner confirms the upload
    Then the request is rejected with VIDEO_UPLOAD_NOT_FOUND
    And the video remains AWAITING_UPLOAD
    And no VideoUploaded.v1 intent is created

  Scenario: Hide a video owned by another user
    Given another user owns an AWAITING_UPLOAD video
    When the authenticated user tries to confirm that upload
    Then the request is rejected with VIDEO_NOT_FOUND
    And no information about the foreign video is disclosed
