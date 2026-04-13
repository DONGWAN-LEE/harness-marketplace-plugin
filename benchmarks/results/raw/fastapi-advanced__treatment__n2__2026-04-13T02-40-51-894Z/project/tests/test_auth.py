import base64
import hashlib
import hmac
import json
import time

from fastapi.testclient import TestClient

from app.auth import create_access_token
from app.main import app
from app.settings import settings

client = TestClient(app)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _make_expired_jwt(user_id: int) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": str(user_id), "exp": int(time.time()) - 3600}
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}"
    signature = hmac.new(
        settings.jwt_secret.encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_b64url_encode(signature)}"


def test_me_no_auth_header() -> None:
    response = client.get("/me")
    assert response.status_code == 401


def test_me_valid_jwt() -> None:
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {create_access_token(42)}"},
    )
    assert response.status_code == 200
    assert response.json() == {"user_id": 42}


def test_me_expired_jwt() -> None:
    response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {_make_expired_jwt(42)}"},
    )
    assert response.status_code == 401
