import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker


# SQLAlchemy >= 2.1 routes a bare postgresql:// URL to the psycopg (v3)
# driver, which is not installed — the image ships psycopg2. Pin the driver
# explicitly no matter who supplies the URL: the container entrypoint, .env,
# or the local default below.
def _normalize_db_url(url: str) -> str:
    if url.startswith("postgresql+"):
        return url
    if url.startswith(("postgresql://", "postgres://")):
        return "postgresql+psycopg2://" + url.split("://", 1)[1]
    return url


SQLALCHEMY_DATABASE_URL = _normalize_db_url(
    # "or" (not the getenv default) so an EMPTY DATABASE_URL from compose
    # falls back to the default instead of becoming an unparseable "" URL
    os.getenv("DATABASE_URL") or "postgresql://postgres:postgres@localhost:5432/lab_platform"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
