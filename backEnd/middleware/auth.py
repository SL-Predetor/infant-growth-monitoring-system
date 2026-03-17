from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import httpx
from typing import Optional

security = HTTPBearer(auto_error=False)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[dict]:
    """
    Verify Supabase JWT token.
    Returns user dict if valid, None if no token (for optional auth).
    Raises 401 if token is invalid.
    """
    if not credentials:
        return None

    token = credentials.credentials

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY,
                },
            )

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Auth service unavailable")


async def require_auth(user: dict = Depends(get_current_user)) -> dict:
    """Use this dependency on routes that require authentication."""
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
