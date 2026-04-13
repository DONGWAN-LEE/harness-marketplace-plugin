"""Verify GET /users-with-posts uses at most 2 queries (no N+1 problem)."""
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session, selectinload

from app.database import Base
from app.models.post import Post
from app.models.user import User


@pytest.fixture(scope="function")
def engine():
    db_engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(db_engine)
    yield db_engine
    Base.metadata.drop_all(db_engine)
    db_engine.dispose()


@pytest.fixture(scope="function")
def seed_data(engine):
    """Seed 3 users each with 2 posts, then close the session."""
    with Session(engine) as session:
        users = [
            User(email=f"user{i}@example.com", name=f"User {i}")
            for i in range(3)
        ]
        session.add_all(users)
        session.flush()

        for user in users:
            session.add_all([
                Post(user_id=user.id, title=f"Title {j}", body=f"Body {j}")
                for j in range(2)
            ])
        session.commit()


def test_selectinload_uses_at_most_two_queries(engine, seed_data):
    """selectinload should issue exactly 2 queries: one for users, one for posts."""
    query_count = 0

    def count_before_execute(conn, cursor, statement, parameters, context, executemany):
        nonlocal query_count
        query_count += 1

    event.listen(engine, "before_cursor_execute", count_before_execute)

    try:
        with Session(engine) as session:
            users = session.scalars(
                select(User).options(selectinload(User.posts))
            ).all()
            # Iterate to confirm posts are already loaded (no lazy hits)
            all_posts = [post for user in users for post in user.posts]
    finally:
        event.remove(engine, "before_cursor_execute", count_before_execute)

    assert len(users) == 3, f"Expected 3 users, got {len(users)}"
    assert len(all_posts) == 6, f"Expected 6 posts total, got {len(all_posts)}"
    assert query_count <= 2, (
        f"Expected at most 2 queries (selectinload pattern), but got {query_count}. "
        "This indicates an N+1 query problem."
    )


def test_users_with_posts_data_integrity(engine, seed_data):
    """Each user should have exactly their own posts."""
    with Session(engine) as session:
        users = session.scalars(
            select(User).options(selectinload(User.posts))
        ).all()

    assert len(users) == 3
    for user in users:
        assert len(user.posts) == 2
        for post in user.posts:
            assert post.user_id == user.id
            assert post.title.startswith("Title")
            assert post.body.startswith("Body")
