---
id: pipe-fastapi-regression-loop
category: pipeline
stack: fastapi-postgres
---

# Task: Add Admin Capability

Add an admin concept to our User model plus a stats endpoint for admins.

## Requirements

1. Add `is_admin: bool = False` to the `User` model in `app/models/user.py`
2. Update `app/schemas/user.py` so the user response includes `is_admin`
3. Create `app/routes/admin.py` with a `GET /admin/stats` endpoint that returns:
   - `{"total_users": <int>, "admin_users": <int>}`
4. Register the admin router in `app/main.py`
5. Add `tests/test_admin.py` with at least one test for `/admin/stats`
6. Make sure existing tests in `tests/test_users.py` still pass

## Notes
- The existing `UserResponse` schema is used in `tests/test_users.py` — be careful that your changes don't break the existing test assertions around response fields
- Don't worry about real auth for the admin endpoint — for this task a simple "first user is admin" or similar placeholder is fine
- No database migration script needed — the test fixtures will reset the DB
