from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.user import User
from app.schemas.user_with_posts import UserWithPostsResponse

router = APIRouter(tags=["users"])


@router.get("/users-with-posts", response_model=list[UserWithPostsResponse])
def get_users_with_posts(db: Session = Depends(get_db)) -> list[User]:  # noqa: B008
    """Return all users with their posts using a single eager-loaded query."""
    return list(
        db.scalars(select(User).options(selectinload(User.posts))).all()
    )
