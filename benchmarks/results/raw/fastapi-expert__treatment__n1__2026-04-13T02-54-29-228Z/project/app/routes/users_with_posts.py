from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.user import User
from app.schemas.user_with_posts import UserWithPostsResponse

router = APIRouter()


@router.get("/users-with-posts", response_model=list[UserWithPostsResponse])
def get_users_with_posts(
    limit: int = 100,
    db: Session = Depends(get_db),  # noqa: B008
) -> list[User]:
    stmt = select(User).options(selectinload(User.posts)).limit(limit)
    return list(db.scalars(stmt).all())
