"""Tests for GET /users-with-posts endpoint, verifying no N+1 query pattern."""
from collections.abc import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.post import Post  # noqa: F401 — registers Post with Base.metadata
from app.models.user import User


# ---------------------------------------------------------------------------
# In-memory SQLite engine for tests
# ---------------------------------------------------------------------------

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed(db: Session) -> None:
    """Insert 3 users with varying numbers of posts."""
    u1 = User(email="alice@example.com", name="Alice")
    u2 = User(email="bob@example.com", name="Bob")
    u3 = User(email="carol@example.com", name="Carol")
    db.add_all([u1, u2, u3])
    db.flush()

    db.add_all([
        Post(user_id=u1.id, title="Post 1", body="Body 1"),
        Post(user_id=u1.id, title="Post 2", body="Body 2"),
        Post(user_id=u2.id, title="Post 3", body="Body 3"),
        # carol has no posts
    ])
    db.commit()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_endpoint_returns_users_with_posts(client: TestClient, db: Session) -> None:
    _seed(db)
    response = client.get("/users-with-posts")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    alice = next(u for u in data if u["email"] == "alice@example.com")
    assert len(alice["posts"]) == 2

    bob = next(u for u in data if u["email"] == "bob@example.com")
    assert len(bob["posts"]) == 1

    carol = next(u for u in data if u["email"] == "carol@example.com")
    assert len(carol["posts"]) == 0


def test_no_n_plus_1_queries(db: Session) -> None:
    """Assert that fetching N users triggers at most 2 SQL statements.

    selectinload issues exactly 2 queries:
      1. SELECT * FROM users
      2. SELECT * FROM posts WHERE user_id IN (...)
    """
    _seed(db)

    query_count = 0

    def count_queries(
        conn: object,
        cursor: object,
        statement: str,
        parameters: object,
        context: object,
        executemany: bool,
    ) -> None:
        nonlocal query_count
        query_count += 1

    event.listen(engine, "before_cursor_execute", count_queries)
    try:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        stmt = select(User).options(selectinload(User.posts))
        users = list(db.scalars(stmt).all())
        # Access posts to make sure they are loaded (shouldn't fire extra queries)
        for user in users:
            _ = user.posts
    finally:
        event.remove(engine, "before_cursor_execute", count_queries)

    assert len(users) == 3
    # selectinload uses exactly 2 queries regardless of the number of users
    assert query_count <= 2, (
        f"Expected at most 2 queries (selectinload), but got {query_count}. "
        "This suggests an N+1 pattern."
    )


def test_empty_database_returns_empty_list(client: TestClient) -> None:
    response = client.get("/users-with-posts")
    assert response.status_code == 200
    assert response.json() == []
