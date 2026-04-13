from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.user import User
from app.schemas.user_with_posts import UserWithPostsResponse

router = APIRouter(prefix="/users-with-posts", tags=["users-with-posts"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[UserWithPostsResponse])
async def get_users_with_posts(db: DbSession) -> list[User]:
    stmt = select(User).options(selectinload(User.posts))
    result = db.execute(stmt)
    return list(result.scalars().all())
