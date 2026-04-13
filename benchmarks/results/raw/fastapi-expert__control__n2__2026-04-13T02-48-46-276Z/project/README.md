# FastAPI + PostgreSQL Seed

Minimal reference project used by the harness-marketplace Phase 0 A/B pilot.

## Stack
- FastAPI 0.115
- SQLAlchemy 2.0 (typed models)
- Alembic (migrations)
- psycopg 3 (Postgres driver)
- Pydantic Settings
- pytest + httpx

## Running
```bash
pip install -e ".[dev]"
uvicorn app.main:app --reload    # dev server
pytest                            # tests
ruff check .                      # lint
mypy app                          # type check
```

## Notes
Bare seed — no auth, single User model, health endpoint. Benchmark tasks will add endpoints and logic to this baseline.

Used by both control and treatment conditions. Treatment additionally overlays `fastapi-postgres-harness/` on top.
