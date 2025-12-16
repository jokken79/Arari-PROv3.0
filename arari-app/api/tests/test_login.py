
from dotenv import load_dotenv
from fastapi.testclient import TestClient

# Cargar variables de entorno
load_dotenv()

# The database initialization (including default user creation) is now handled by the test fixtures.


def test_login_correct_credentials(test_client: TestClient):
    """Test login with correct credentials."""
    response = test_client.post(
        "/api/auth/login", json={"username": "Admin", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data or "token" in data  # Check for either token key
    assert data["user"]["username"] == "Admin"
    assert data["user"]["role"] == "admin"


def test_login_incorrect_password(test_client: TestClient):
    """Test login with incorrect password."""
    response = test_client.post(
        "/api/auth/login", json={"username": "Admin", "password": "WrongPassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_incorrect_username(test_client: TestClient):
    """Test login with incorrect username."""
    response = test_client.post(
        "/api/auth/login", json={"username": "NonExistentUser", "password": "admin123"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"
