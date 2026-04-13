# Import all models so SQLAlchemy's mapper registry is fully populated
# before any query runs. Relationships are resolved lazily by string name,
# so both sides must be imported at startup.
from app.models.post import Post as Post  # noqa: F401
from app.models.user import User as User  # noqa: F401
