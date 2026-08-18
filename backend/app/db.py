"""
Supabase client for the backend.

This uses the service-role key, which **bypasses every Row Level Security
policy**. That is the whole reason `app/services/persistence.py` checks
ownership by hand before it reads or writes anything on behalf of a user.

Never return a raw query result to a caller without having verified that the
caller owns the row.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_db() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase is not configured. Copy backend/.env.example to "
            "backend/.env and set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
