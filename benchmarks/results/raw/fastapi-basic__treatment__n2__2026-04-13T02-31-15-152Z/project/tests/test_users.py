from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app

client = TestClient(app)


def test_get_user_not_found() -> None:
    mock_db = MagicMock()
    mock_db.get.return_value = None

    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.get("/users/999")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}
