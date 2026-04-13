from datetime import datetime

from pydantic import BaseModel


class PostResponse(BaseModel):
    id: int
    user_id: int
    title: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserWithPostsResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime
    posts: list[PostResponse]

    model_config = {"from_attributes": True}
