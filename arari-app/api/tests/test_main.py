from fastapi.testclient import TestClient

from main import app


def test_health_check():
    """
    Tests the /api/health endpoint.
    """
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": "2.0.0"}
