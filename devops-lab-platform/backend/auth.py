import os
import uuid
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext

# Fail closed: without a signing key every JWT could be forged with a known
# string. Compose provides it via secrets-init (app_secrets volume); local runs
# export SECRET_KEY (see backend/tests/conftest.py and scripts/live_backend_runner_p4.py).
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not set — refusing to start. Generate one with "
        "scripts/gen_secrets.sh (compose does this automatically) or export SECRET_KEY."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def utcnow():
    """Naive UTC timestamp — matches the naive columns the DB stores.

    datetime.utcnow() is deprecated in 3.12+; this keeps the exact same
    (naive) semantics without mixing tz-aware values into comparisons."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    # jti identifies this refresh token so logout can revoke it individually
    to_encode.setdefault("jti", uuid.uuid4().hex)
    expire = utcnow() + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
