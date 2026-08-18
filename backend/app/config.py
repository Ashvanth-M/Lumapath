"""Backend configuration, loaded from environment or a local .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    cors_origins: str = "http://localhost:8080"
    max_upload_mb: int = 500

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_configured(self) -> bool:
        return bool(
            self.supabase_url
            and self.supabase_service_role_key
            and self.supabase_jwt_secret
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
