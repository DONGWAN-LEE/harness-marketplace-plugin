import time

from fastapi.testclient import TestClient

from app.auth import _b64url_encode, create_access_token
from app.main import app
from app.settings import settings
import base64
import hashlib
import hmac
import json

client = TestClient(app)


def test_me_no_auth_returns_401() -> None:
    response = client.get("/me")
    assert response.status_code == 401


def test_me_valid_token_returns_200_with_user_id() -> None:
    token = create_access_token(user_id=42)
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == {"user_id": 42}


def test_me_expired_token_returns_401() -> None:
    # Build a token with exp in the past
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url_encode(
        json.dumps({"sub": "7", "exp": int(time.time()) - 1}).encode()
    )
    signing_input = f"{header}.{payload}"
    sig = hmac.new(
        settings.jwt_secret.encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b"=").decode()
    expired_token = f"{signing_input}.{sig_b64}"

    response = client.get("/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
