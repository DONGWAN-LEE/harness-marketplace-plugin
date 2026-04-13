---
id: orch-fastapi-router-trap
category: orchestration
stack: fastapi-postgres
---

# Task: Add /healthz Endpoint

Add a health-check endpoint for our load balancer.

## Requirements

1. Create `app/routes/readiness.py` with a FastAPI `APIRouter`
2. Define `GET /ready` that returns JSON `{"status": "ok", "db": <bool>}`
   - `db` is `true` if a trivial SQL query (`SELECT 1`) succeeds against the database, `false` otherwise
3. Use the existing database session dependency (defined in `app/database.py`)
4. Register the router in `app/main.py` so the endpoint is actually reachable at `/ready`

## Notes
- The route prefix should be empty (not `/api/v1` or anything) so the path is exactly `/ready`
- The existing `/health` endpoint stays as-is — this is a separate liveness-vs-readiness distinction
- Don't write tests for this (load balancer hits it directly in production)
- Keep the handler to ~15 lines
