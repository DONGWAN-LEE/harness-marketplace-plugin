import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.post import Post  # noqa: F401 — registers Post with Base metadata
from app.models.user import User

SQLITE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db() -> Session:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_users_with_posts_returns_correct_data(db: Session) -> None:
    user = User(email="alice@example.com", name="Alice")
    db.add(user)
    db.flush()

    db.add(Post(user_id=user.id, title="Hello", body="World"))
    db.add(Post(user_id=user.id, title="Second", body="Post"))
    db.commit()

    response = client.get("/users-with-posts")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["email"] == "alice@example.com"
    assert len(data[0]["posts"]) == 2
    assert data[0]["posts"][0]["title"] in {"Hello", "Second"}


def test_users_with_posts_query_count(db: Session) -> None:
    """Assert that the endpoint issues ≤2 queries (no N+1)."""
    # Seed two users each with two posts.
    for i in range(2):
        user = User(email=f"user{i}@example.com", name=f"User {i}")
        db.add(user)
        db.flush()
        db.add(Post(user_id=user.id, title=f"Post A{i}", body="body"))
        db.add(Post(user_id=user.id, title=f"Post B{i}", body="body"))
    db.commit()

    query_count = 0

    def _before_execute(conn, cursor, statement, parameters, context, executemany):
        nonlocal query_count
        query_count += 1

    event.listen(engine, "before_cursor_execute", _before_execute)
    try:
        response = client.get("/users-with-posts")
    finally:
        event.remove(engine, "before_cursor_execute", _before_execute)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # selectinload: 1 query for users + 1 query for all posts → exactly 2
    assert query_count <= 2, (
        f"N+1 detected: expected ≤2 queries but executed {query_count}"
    )


def test_users_with_posts_empty(db: Session) -> None:  # noqa: ARG001
    response = client.get("/users-with-posts")
    assert response.status_code == 200
    assert response.json() == []
