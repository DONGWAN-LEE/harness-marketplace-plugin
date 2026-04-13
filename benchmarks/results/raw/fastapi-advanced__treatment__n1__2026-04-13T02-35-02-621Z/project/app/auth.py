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
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def _sign(header_b64: str, payload_b64: str) -> str:
    message = f"{header_b64}.{payload_b64}".encode()
    key = settings.jwt_secret.encode()
    sig = hmac.new(key, message, hashlib.sha256).digest()
    return _b64url_encode(sig)


def create_access_token(user_id: int) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    exp = int(time.time()) + settings.access_token_expire_minutes * 60
    payload = _b64url_encode(json.dumps({"sub": str(user_id), "exp": exp}).encode())
    signature = _sign(header, payload)
    return f"{header}.{payload}.{signature}"


def verify_token(raw: str) -> int:
    try:
        parts = raw.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid structure")
        header_b64, payload_b64, sig_b64 = parts

        expected = _sign(header_b64, payload_b64)
        if not hmac.compare_digest(expected, sig_b64):
            raise ValueError("Bad signature")

        claims = json.loads(_b64url_decode(payload_b64))
        if int(time.time()) >= claims["exp"]:
            raise ValueError("Expired")

        return int(claims["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Unauthorized") from None


async def get_current_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    jwt = authorization[len("Bearer "):]
    return verify_token(jwt)
