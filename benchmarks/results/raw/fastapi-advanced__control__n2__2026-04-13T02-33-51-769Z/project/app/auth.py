import base64
import hashlib
import hmac
import json
import time

from fastapi import Header, HTTPException

from app.settings import settings


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    # Restore padding
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def _sign(signing_input: str) -> str:
    key = settings.jwt_secret.encode()
    sig = hmac.new(key, signing_input.encode(), hashlib.sha256).digest()
    return _b64url_encode(sig)


def create_access_token(user_id: int) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    exp = int(time.time()) + settings.access_token_expire_minutes * 60
    payload = {"sub": str(user_id), "exp": exp}

    header_enc = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_enc = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_enc}.{payload_enc}"
    signature = _sign(signing_input)

    return f"{signing_input}.{signature}"


def verify_token(token: str) -> int:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token structure")

        header_enc, payload_enc, signature = parts
        signing_input = f"{header_enc}.{payload_enc}"

        expected_sig = _sign(signing_input)
        if not hmac.compare_digest(expected_sig, signature):
            raise ValueError("Invalid signature")

        payload = json.loads(_b64url_decode(payload_enc))
        if int(time.time()) >= payload["exp"]:
            raise ValueError("Token expired")

        return int(payload["sub"])
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


async def get_current_user_id(authorization: str | None = Header(default=None)) -> int:
    if authorization is None:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    return verify_token(token)
