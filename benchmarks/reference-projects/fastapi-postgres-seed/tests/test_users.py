"""Tests for /users endpoints.

These tests MUST keep passing even after other features are added to User.
If you change UserResponse shape (e.g. add fields), make sure the assertions
here still hold.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_users_empty_ok():
    """GET /users should return a list (even if empty)."""
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_user_404_for_missing():
    """Missing user_id must 404."""
    response = client.get("/users/999999")
    assert response.status_code == 404
    body = response.json()
    assert "detail" in body
