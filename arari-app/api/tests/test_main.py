from fastapi.testclient import TestClient

from main import app


def test_health_check():
    """
    Tests the /api/health endpoint.
    """
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "3.0.0"
    assert "timestamp" in data
    assert "database" in data
    assert "environment" in data
    assert "response_time_ms" in data
    assert "api_endpoints" in data
