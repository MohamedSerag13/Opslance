import os
import sys

# Add backend directory to sys.path so we can import from database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def fix():
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version;"))
        conn.commit()
        print("Successfully dropped alembic_version table.")

if __name__ == "__main__":
    fix()
