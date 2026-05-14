"""API route dependencies."""

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security_scheme)],
) -> Optional[str]:
    """Extract user_id from JWT token. Returns None if no valid token."""
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    return payload.get("sub")


async def require_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security_scheme)],
) -> str:
    """Require a valid JWT token; raises 401 if missing or invalid."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_access_token(credentials.credentials)
    if payload is None or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return payload["sub"]