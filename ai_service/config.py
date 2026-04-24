# ai_service/config.py
"""애플리케이션 설정 관리."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """FastAPI AI 서비스 설정.

    환경변수 또는 .env 파일에서 값을 로드한다.
    """

    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    debug: bool = True
    ai_service_secret: str = ""

    anthropic_api_key: str = ""

    ollama_base_url: str = "http://host.docker.internal:11434"
    gemma_model: str = "gemma4:e2b"

    molit_api_key: str = ""
    dart_api_key: str = ""
    kmooc_api_key: str = ""

    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]


@lru_cache
def get_settings() -> Settings:
    """설정 싱글턴 반환."""
    return Settings()


settings = get_settings()
