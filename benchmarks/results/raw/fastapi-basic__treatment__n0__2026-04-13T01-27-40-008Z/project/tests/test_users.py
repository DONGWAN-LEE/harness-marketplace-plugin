from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app


def get_db_returning_none():
    db = MagicMock()
    db.get.return_value = None
    yield db


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = get_db_returning_none
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_get_user_not_found(client):
    response = client.get("/users/999")
    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}
