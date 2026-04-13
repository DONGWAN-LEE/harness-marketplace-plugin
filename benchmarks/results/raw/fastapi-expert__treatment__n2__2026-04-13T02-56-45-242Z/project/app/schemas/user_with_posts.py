from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    body: str
    created_at: datetime


class UserWithPostsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    created_at: datetime
    posts: list[PostResponse]
