import logging
from typing import Annotated, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from services.supabase import client

logger = logging.getLogger(__name__)

# Security scheme
bearer_scheme = HTTPBearer()


def decode_jwt_token(token: str) -> Dict[str, any]:
    """Decode and verify JWT token using Supabase."""
    try:
        # Use Supabase client to verify the JWT
        user = client.auth.get_user(token)
        if not user or not user.user:
            raise ValueError("Invalid token")

        return {
            "user_id": user.user.id,
            "email": user.user.email,
            "user_metadata": user.user.user_metadata,
        }
    except Exception as e:
        logger.error(f"Failed to decode JWT: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_user_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
) -> str:
    """Get current user ID from JWT token."""
    user_info = decode_jwt_token(credentials.credentials)
    return user_info["user_id"]
