from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.post import Post  # noqa: F401 — ensure Post is registered with Base
from app.models.user import User

TEST_DATABASE_URL = "sqlite://"


@pytest.fixture
def db_engine():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(db_engine) -> Generator[Session, None, None]:
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _seed_users_and_posts(db: Session, num_users: int = 3, posts_per_user: int = 2) -> list[User]:
    users = [User(email=f"user{i}@test.com", name=f"User {i}") for i in range(num_users)]
    db.add_all(users)
    db.flush()
    posts = [
        Post(user_id=user.id, title=f"Post {j} of {user.name}", body=f"Body {j}")
        for user in users
        for j in range(posts_per_user)
    ]
    db.add_all(posts)
    db.commit()
    return users


def test_users_with_posts_returns_correct_structure(client: TestClient, db_session: Session) -> None:
    users = _seed_users_and_posts(db_session, num_users=2, posts_per_user=2)
    user_ids = {u.id for u in users}

    response = client.get("/users-with-posts")
    assert response.status_code == 200

    data = response.json()
    returned_ids = {item["id"] for item in data}
    assert user_ids.issubset(returned_ids)

    for item in data:
        if item["id"] in user_ids:
            assert "posts" in item
            assert isinstance(item["posts"], list)
            for post in item["posts"]:
                assert "id" in post
                assert "title" in post
                assert "body" in post
                assert post["user_id"] == item["id"]


def test_users_with_posts_no_n_plus_one(
    client: TestClient, db_session: Session, db_engine
) -> None:
    """Verify the endpoint issues at most 2 SELECT queries regardless of user count."""
    _seed_users_and_posts(db_session, num_users=5, posts_per_user=3)

    select_queries: list[str] = []

    def _count_selects(conn, cursor, statement, parameters, context, executemany) -> None:
        if statement.strip().upper().startswith("SELECT"):
            select_queries.append(statement)

    event.listen(db_engine, "before_cursor_execute", _count_selects)
    try:
        response = client.get("/users-with-posts")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 5

        # selectinload issues exactly 2 queries (users + posts IN (...));
        # joinedload would issue 1. N+1 would issue 6+ for 5 users.
        assert len(select_queries) <= 2, (
            f"N+1 query detected: expected ≤2 SELECT queries, got {len(select_queries)}"
        )
    finally:
        event.remove(db_engine, "before_cursor_execute", _count_selects)
