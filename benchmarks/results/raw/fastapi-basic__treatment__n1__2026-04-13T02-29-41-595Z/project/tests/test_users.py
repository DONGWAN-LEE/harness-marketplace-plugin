from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app


def override_get_db():
    db = MagicMock()
    db.get.return_value = None
    yield db


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_get_user_not_found() -> None:
    response = client.get("/users/999")
    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}
