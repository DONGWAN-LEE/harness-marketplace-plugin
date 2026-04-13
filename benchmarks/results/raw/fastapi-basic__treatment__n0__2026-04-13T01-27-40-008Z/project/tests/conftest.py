from unittest.mock import MagicMock

import sqlalchemy

# Replace create_engine before any app module imports it.
# This prevents psycopg (not installed in the test env) from being loaded.
sqlalchemy.create_engine = MagicMock(return_value=MagicMock())
