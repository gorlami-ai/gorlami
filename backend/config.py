from functools import lru_cache
from typing import List, Literal, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration using Pydantic settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server Configuration
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    # API Keys
    deepgram_api_key: str
    azure_openai_endpoint_url: str
    azure_openai_deployment_name: str = "gpt-4o-mini"
    azure_openai_api_key: str

    # Supabase Configuration
    supabase_url: str
    supabase_key: str

    # CORS Configuration
    cors_origins: List[str] = ["tauri://localhost"]  # Default for Tauri app

    # AI Processing Configuration
    openai_api_version: str = "2025-01-01-preview"
    openai_temperature: float = 0.7
    openai_max_tokens: int = 2000
    openai_enhancement_temperature: float = 0.3
    openai_enhancement_max_tokens: int = 500

    # Deepgram Configuration
    deepgram_model: str = "nova-2"
    deepgram_language: str = "en-US"
    deepgram_utterance_end_ms: int = 1000

    # Logging
    log_level: str = "INFO"

    # Environment
    environment: Literal["development", "staging", "production"] = "development"

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        valid_envs = ["development", "staging", "production"]
        if v.lower() not in valid_envs:
            raise ValueError(f"Invalid environment: {v}. Must be one of {valid_envs}")
        return v.lower()

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment.lower() == "development"

    @property
    def is_staging(self) -> bool:
        """Check if running in staging mode."""
        return self.environment.lower() == "staging"

    @property
    def allowed_origins(self) -> List[str]:
        """Get allowed CORS origins.

        In production, this should typically be ["tauri://localhost"] for the Tauri app.
        In development, you might want to add "http://localhost:1420" for the Vite dev server.

        Configure via CORS_ORIGINS env var as JSON array: ["tauri://localhost", "http://localhost:1420"]
        """
        return self.cors_origins


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
