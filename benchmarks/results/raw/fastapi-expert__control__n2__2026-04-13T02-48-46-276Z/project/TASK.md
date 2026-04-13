# Task: Fix N+1 Query Pattern

A previous engineer added a `GET /users-with-posts` endpoint that returns users along with their posts. The current implementation has a classic N+1 query problem. Refactor it to use a single query (or at most 2).

## Setup

First, create the initial (buggy) implementation, then fix it:

### Step 1: Create the models
- Create `app/models/post.py` with a `Post` SQLAlchemy 2.0 model:
  - `id: int` (primary key)
  - `user_id: int` (foreign key to `users.id`)
  - `title: str` (max 200 chars, nullable=False)
  - `body: str` (nullable=False)
  - `created_at: datetime` (server default now)
- Add a relationship on `User`: `posts: Mapped[list["Post"]] = relationship(back_populates="user")` and on `Post`: `user: Mapped["User"] = relationship(back_populates="posts")`

### Step 2: Create the endpoint
- Create `app/schemas/user_with_posts.py` with `UserWithPostsResponse` Pydantic schema containing user fields + `posts: list[PostResponse]`
- Create `app/routes/users_with_posts.py` with `GET /users-with-posts`
- **The final implementation must use `selectinload` or `joinedload`** to avoid N+1 — do NOT iterate over users and trigger lazy loads. A single query with eager loading is the correct solution.
- Register the router in `app/main.py`

### Step 3: Add a test
- Add `tests/test_users_with_posts.py` that:
  - Creates a SQL-level test that uses SQLAlchemy's query logging to assert that only 1-2 queries are executed (not N+1).
  - Alternatively: use a mock or counter pattern to verify the query count.

## Acceptance Criteria

- File `app/models/post.py` exists with typed SQLAlchemy 2.0 model
- Relationships defined on both sides (bidirectional `back_populates`)
- File `app/routes/users_with_posts.py` exists
- **The query MUST use `selectinload(User.posts)` OR `joinedload(User.posts)`** — grep for these in the file
- Does NOT have a loop that calls `.posts` on each user without eager loading
- Test file exists at `tests/test_users_with_posts.py`
- `pytest tests/test_users_with_posts.py --collect-only` succeeds
- `ruff check app/routes/users_with_posts.py` passes (if runnable)

## Scope Boundaries

- Do NOT create Alembic migrations
- Do NOT implement write endpoints
- Do NOT add pagination (but you may add a default limit)
- Do NOT modify `app/database.py` or `app/settings.py`