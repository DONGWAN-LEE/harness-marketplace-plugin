---
id: orch-fastapi-pagination
category: orchestration
stack: fastapi-postgres
---

# Task: Add Cursor Pagination to GET /users

The `GET /users` endpoint currently returns all users. Add cursor-based pagination.

## Requirements

1. Update `app/routes/users.py`:
   - Add query params: `limit: int = 20` (max 100), `after_id: Optional[int] = None`
   - Return shape: `{"items": [...users], "next_cursor": <int | None>}`
   - When `after_id` is provided, only return users with `id > after_id`, ordered by `id ASC`, capped at `limit`
   - `next_cursor` should be the last item's id when there might be more results, or `None` when the page is the end
2. Update `app/schemas/user.py` (or create a new `PaginatedUsers` schema) to reflect the new response shape
3. Update `tests/test_users.py` to add at least one test for the pagination behavior

## Notes
- Keep changes contained to the three files above (`app/routes/users.py`, `app/schemas/user.py`, `tests/test_users.py`)
- No changes to the database model required — just add sorting + WHERE clause in the query
- Existing tests should still pass
