import os
import sqlite3
import sys

import pytest
from fastapi.testclient import TestClient

# Add the parent directory to the sys.path to allow imports from the api module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_db, init_db
from main import app


@pytest.fixture(scope="function")
def db_session():
    """
    Provides a fresh, in-memory database with a connection for each test function.
    """
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    init_db(conn)

    def get_test_db():
        return conn

    app.dependency_overrides[get_db] = get_test_db

    yield conn

    conn.close()
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_client(db_session):
    """
    Create a TestClient for FastAPI, using the isolated db_session.
    """
    client = TestClient(app)
    yield client


@pytest.fixture(scope="function")
def auth_headers(test_client):
    """
    Provides authentication headers with a valid admin token.
    Login with default admin credentials and return the token.
    """
    response = test_client.post(
        "/api/auth/login",
        json={"username": "Admin", "password": "admin123"}
    )
    assert response.status_code == 200, f"Login failed: {response.json()}"
    token = response.json().get("token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def authenticated_client(test_client, auth_headers):
    """
    Create an authenticated TestClient that includes auth headers by default.
    """
    # Store original methods
    original_post = test_client.post
    original_put = test_client.put
    original_delete = test_client.delete

    def post_with_auth(*args, headers=None, **kwargs):
        merged_headers = {**auth_headers, **(headers or {})}
        return original_post(*args, headers=merged_headers, **kwargs)

    def put_with_auth(*args, headers=None, **kwargs):
        merged_headers = {**auth_headers, **(headers or {})}
        return original_put(*args, headers=merged_headers, **kwargs)

    def delete_with_auth(*args, headers=None, **kwargs):
        merged_headers = {**auth_headers, **(headers or {})}
        return original_delete(*args, headers=merged_headers, **kwargs)

    test_client.post = post_with_auth
    test_client.put = put_with_auth
    test_client.delete = delete_with_auth

    yield test_client

    # Restore original methods
    test_client.post = original_post
    test_client.put = original_put
    test_client.delete = original_delete
