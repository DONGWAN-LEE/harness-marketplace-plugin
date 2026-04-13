import json
import time

from fastapi.testclient import TestClient

from app.auth import _b64url_encode, _sign, create_access_token
from app.main import app

client = TestClient(app)


def test_me_missing_auth_header_returns_401() -> None:
    response = client.get("/me")
    assert response.status_code == 401


def test_me_valid_token_returns_200_and_user_id() -> None:
    user_id = 42
    token = create_access_token(user_id)
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == {"user_id": user_id}


def test_me_expired_token_returns_401() -> None:
    # Build a token with exp in the past
    import base64

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": "7", "exp": int(time.time()) - 10}

    header_enc = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_enc = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_enc}.{payload_enc}"
    signature = _sign(signing_input)
    expired_token = f"{signing_input}.{signature}"

    response = client.get("/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
