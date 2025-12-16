import pytest
from fastapi.testclient import TestClient
import sqlite3
import os
import sys

# Add the parent directory to the sys.path to allow imports from the api module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app
from database import get_db, init_db

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
