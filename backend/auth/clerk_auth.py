from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from jose.exceptions import JWTError
import httpx
import os
import time
import logging
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)
security = HTTPBearer()

CLERK_PUBLISHABLE_KEY = os.environ.get("CLERK_PUBLISHABLE_KEY")
CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY")
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL")
CLERK_ISSUER = os.environ.get("CLERK_ISSUER")

if not CLERK_JWKS_URL or not CLERK_ISSUER:
    if CLERK_PUBLISHABLE_KEY:
        if CLERK_PUBLISHABLE_KEY.startswith(
            "pk_test_"
        ) or CLERK_PUBLISHABLE_KEY.startswith("pk_live_"):
            logger.warning(
                "CLERK_JWKS_URL and CLERK_ISSUER not set. Please set them from your Clerk Dashboard."
            )
            logger.warning("Go to: Configure → Developers → API Keys → Show JWT Public Key")

            key_suffix = CLERK_PUBLISHABLE_KEY.split("_")[-1][:10]
            CLERK_ISSUER = CLERK_ISSUER or f"https://clerk.{key_suffix}.lcl.dev"
            CLERK_JWKS_URL = CLERK_JWKS_URL or f"{CLERK_ISSUER}/.well-known/jwks.json"

if not CLERK_JWKS_URL:
    raise ValueError(
        "CLERK_JWKS_URL must be set. Get it from Clerk Dashboard: Configure → Developers → API Keys → Show JWT Public Key"
    )

if not CLERK_ISSUER:
    raise ValueError(
        "CLERK_ISSUER must be set. Get it from Clerk Dashboard: Configure → Developers → API Keys → Show JWT Public Key"
    )

clerk_client = None
try:
    from clerk_backend_sdk import Clerk

    if CLERK_SECRET_KEY:
        clerk_client = Clerk(bearer_auth=CLERK_SECRET_KEY)
except ImportError:
    try:
        from clerk import ClerkClient

        if CLERK_SECRET_KEY:
            clerk_client = ClerkClient(api_key=CLERK_SECRET_KEY)
    except ImportError:
        pass

_jwks_cache: Optional[Dict] = None
_jwks_cache_timestamp: float = 0
JWKS_CACHE_TTL = 3600


async def get_jwks() -> Dict:
    """Fetch and cache JWKS from Clerk"""
    global _jwks_cache, _jwks_cache_timestamp

    current_time = time.time()
    if _jwks_cache is None or (current_time - _jwks_cache_timestamp) > JWKS_CACHE_TTL:
        try:
            logger.info(f"Fetching JWKS from: {CLERK_JWKS_URL}")
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(CLERK_JWKS_URL)
                response.raise_for_status()
                _jwks_cache = response.json()
                _jwks_cache_timestamp = current_time
                logger.info("JWKS fetched successfully")
        except httpx.RequestError as e:
            logger.error(f"JWKS fetch error: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to fetch JWKS: {str(e)}"
            )
        except httpx.HTTPStatusError as e:
            logger.error(
                f"JWKS HTTP error: {e.response.status_code} - {e.response.text}"
            )
            raise HTTPException(
                status_code=500, detail=f"JWKS endpoint error: {e.response.status_code}"
            )

    return _jwks_cache


async def decode_clerk_token(token: str) -> Dict:
    """Decode and validate Clerk JWT token"""
    try:
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        if not kid:
            raise HTTPException(status_code=401, detail="Token missing key ID")

        jwks = await get_jwks()
        key_dict = next((key for key in jwks["keys"] if key["kid"] == kid), None)
        if not key_dict:
            raise HTTPException(status_code=401, detail="Token key not found in JWKS")

        key = jwk.construct(key_dict)
        decoded_token = jwt.decode(
            token,
            key.to_pem().decode("utf-8"),
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False},
        )
        return decoded_token

    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        raise HTTPException(
            status_code=401, detail=f"Token validation failed: {str(e)}"
        )


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Extract user ID from Clerk JWT token"""
    token = credentials.credentials
    payload = await decode_clerk_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    return user_id


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict:
    """Get full decoded token payload"""
    token = credentials.credentials
    return await decode_clerk_token(token)


async def get_current_user_profile(user_id: str = Depends(get_current_user_id)) -> Dict:
    """Get detailed user profile from Clerk backend"""
    if not clerk_client:
        raise HTTPException(
            status_code=500,
            detail="Clerk backend client not configured. Please set CLERK_SECRET_KEY environment variable.",
        )

    try:
        if hasattr(clerk_client, "users"):
            user = clerk_client.users.get_user(user_id)
        else:
            user = clerk_client.get_user(user_id)

        return {
            "id": user.id,
            "first_name": getattr(user, "first_name", None),
            "last_name": getattr(user, "last_name", None),
            "email": (
                user.email_addresses[0].email_address if user.email_addresses else None
            ),
            "phone": user.phone_numbers[0].phone_number if user.phone_numbers else None,
            "created_at": getattr(user, "created_at", None),
            "last_active_at": getattr(user, "last_active_at", None),
            "image_url": getattr(user, "image_url", None),
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch user profile: {str(e)}"
        )


ClerkAuth = Depends(get_current_user_id)
ClerkPayload = Depends(get_current_user_payload)
ClerkProfile = Depends(get_current_user_profile)
