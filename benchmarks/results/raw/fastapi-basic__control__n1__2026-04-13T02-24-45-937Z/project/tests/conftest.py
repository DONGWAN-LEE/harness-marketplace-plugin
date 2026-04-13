import os

# Override DATABASE_URL before any app module is imported so SQLAlchemy uses
# the built-in sqlite3 driver instead of psycopg (which may not be installed).
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
