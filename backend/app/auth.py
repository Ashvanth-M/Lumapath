"""
Supabase JWT verification.

The frontend sends the user's Supabase access token as a bearer token. We verify
the signature here and pull the user id out of the `sub` claim. Everything
downstream treats that id as the authenticated caller — it is the only thing
standing between one parent and another parent's child records, because the
service-role client ignores Row Level Security.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="A valid Supabase access token is required.",
    headers={"WWW-Authenticate": "Bearer"},
)


def current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """FastAPI dependency returning the authenticated user's id."""
    if credentials is None or not credentials.credentials:
        raise _UNAUTHENTICATED

    settings = get_settings()
    if not settings.supabase_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET is not set on the server.",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.PyJWTError as exc:
        raise _UNAUTHENTICATED from exc

    user_id = payload.get("sub")
    if not user_id:
        raise _UNAUTHENTICATED
    return str(user_id)
