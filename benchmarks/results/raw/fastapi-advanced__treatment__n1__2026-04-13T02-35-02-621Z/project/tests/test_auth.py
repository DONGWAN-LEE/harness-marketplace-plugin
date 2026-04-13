import json
import time

from fastapi.testclient import TestClient

from app.auth import _b64url_encode, _sign, create_access_token
from app.main import app

client = TestClient(app)


def test_me_no_authorization_header() -> None:
    response = client.get("/me")
    assert response.status_code == 401


def test_me_valid_bearer() -> None:
    jwt = create_access_token(42)
    response = client.get("/me", headers={"Authorization": f"Bearer {jwt}"})
    assert response.status_code == 200
    assert response.json() == {"user_id": 42}


def test_me_expired_bearer() -> None:
    # Build a properly-signed JWT whose exp is in the past
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    past_exp = int(time.time()) - 3600
    payload = _b64url_encode(json.dumps({"sub": "99", "exp": past_exp}).encode())
    sig = _sign(header, payload)
    expired = f"{header}.{payload}.{sig}"
    response = client.get("/me", headers={"Authorization": f"Bearer {expired}"})
    assert response.status_code == 401
