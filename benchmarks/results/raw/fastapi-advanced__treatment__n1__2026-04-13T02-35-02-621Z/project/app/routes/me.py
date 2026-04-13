from fastapi import APIRouter, Depends

from app.auth import get_current_user_id

router = APIRouter(tags=["me"])


@router.get("/me")
async def read_me(user_id: int = Depends(get_current_user_id)) -> dict[str, int]:
    return {"user_id": user_id}
