# Task: JWT Authentication Dependency

Implement a reusable JWT authentication dependency for FastAPI routes.

## Requirements

1. Install nothing — use only Python stdlib. Implement a minimal HS256 JWT verifier yourself using `hmac` and `hashlib` (the jwt spec for HS256 is: `base64url(header).base64url(payload).base64url(hmac_sha256(key, header.payload))`).
2. Create `app/auth.py` with:
   - `def create_access_token(user_id: int) -> str` — creates an HS256 JWT with claims `{"sub": str(user_id), "exp": <now + access_token_expire_minutes from settings>}`. Uses `settings.jwt_secret`.
   - `def verify_token(token: str) -> int` — verifies signature, checks expiration, returns `user_id` (int). Raises `HTTPException(401)` on any failure.
   - `async def get_current_user_id(authorization: str = Header(...)) -> int` — FastAPI dependency that parses `Bearer <token>` and calls `verify_token`.
3. Create `app/routes/me.py` with a protected endpoint `GET /me` that returns `{"user_id": <id>}` using `Depends(get_current_user_id)`.
4. Register the `me` router in `app/main.py`.
5. Add tests in `tests/test_auth.py`:
   - Test that `/me` without Authorization header returns 401
   - Test that `/me` with valid token returns 200 and the correct user_id
   - Test that `/me` with expired token returns 401 (generate token with past exp)

## Acceptance Criteria

- File `app/auth.py` exists with `create_access_token`, `verify_token`, `get_current_user_id`
- File `app/routes/me.py` exists with protected endpoint
- JWT is generated/verified using stdlib (no external jwt package import)
- Uses `settings.jwt_secret` (not hardcoded)
- Uses `Depends(get_current_user_id)`
- Tests exist for 401 missing header, 200 valid token, 401 expired token
- `pytest tests/test_auth.py --collect-only` succeeds
- No hardcoded secrets

## Scope Boundaries

- Do NOT add external dependencies (no `python-jose`, `pyjwt`, etc.)
- Do NOT implement token refresh (access tokens only)
- Do NOT add a database query — /me only returns the token's user_id
- Do NOT modify `app/settings.py`