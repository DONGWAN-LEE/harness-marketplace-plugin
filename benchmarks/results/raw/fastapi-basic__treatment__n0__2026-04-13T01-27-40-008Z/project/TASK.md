# Task: GET /users/{id} Endpoint

Add a GET endpoint to retrieve a user by ID.

## Requirements

1. Create `app/schemas/user.py` with a Pydantic v2 `UserResponse` schema:
   - `id: int`
   - `email: str`
   - `name: str`
   - `created_at: datetime`
2. Create `app/routes/users.py` implementing:
   - `GET /users/{user_id}` endpoint
   - Uses `Depends(get_db)` for the database session
   - Queries the `User` model from `app.models.user`
   - Returns 200 with `UserResponse` if found
   - Returns 404 with `{ "detail": "User not found" }` if not found
3. Register the router in `app/main.py`
4. Add a test in `tests/test_users.py` that:
   - Tests the 404 case using `TestClient`
   - Does not require a real database (the test will fail to start a session, which is expected for 404 path if error is handled)

## Acceptance Criteria

- File `app/schemas/user.py` exists with `UserResponse` class
- File `app/routes/users.py` exists with `router` variable
- Router is included in `app/main.py`
- `get_db` is imported from `app.database`
- Uses `Depends(get_db)` in the route signature
- `pytest tests/test_users.py --collect-only` succeeds (tests are at least syntactically valid)
- `ruff check app/routes/users.py` passes (if runnable)

## Scope Boundaries

- Do NOT create Alembic migrations
- Do NOT modify `app/database.py` or `app/settings.py`
- Do NOT implement POST/PUT/DELETE — GET only
- Do NOT add authentication