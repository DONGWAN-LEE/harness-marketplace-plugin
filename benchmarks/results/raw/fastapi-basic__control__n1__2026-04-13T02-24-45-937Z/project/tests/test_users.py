from collections.abc import Generator
from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app

client = TestClient(app)


def test_get_user_not_found() -> None:
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    def override_get_db() -> Generator:
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        response = client.get("/users/999")
        assert response.status_code == 404
        assert response.json() == {"detail": "User not found"}
    finally:
        app.dependency_overrides.clear()
