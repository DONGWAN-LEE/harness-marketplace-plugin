from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_user_not_found() -> None:
    response = client.get("/users/999")
    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}
