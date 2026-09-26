Feature: Application liveness

  Scenario: running API is alive
    Given that the API completed its bootstrap
    When GET /health/live is requested
    Then the response status should be 200
    And the response should be { "status": "healthy" }
