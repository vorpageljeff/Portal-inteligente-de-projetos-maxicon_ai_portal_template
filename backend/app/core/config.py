from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Maxicon AI Project Portal"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://project_portal:project_portal@localhost:5432/project_portal"
    cors_origins: str = "http://localhost:3000"
    secret_key: str = "dev-only-change-me"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    ai_provider: str = "mock"
    ai_api_key: str | None = None
    ai_model: str | None = None
    gemini_api_key: str | None = None
    log_level: str = "INFO"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value


settings = Settings()
