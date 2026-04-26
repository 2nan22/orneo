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
    gemma_model: str = "qwen2.5:7b"

    # 공공데이터포털 공통 인증키 (MOLIT + K-MOOC)
    data_go_kr_service_key: str = ""

    # DART API 키
    dart_api_key: str = ""

    # MOLIT 부동산 실거래가 엔드포인트
    molit_apt_trade_detail_endpoint: str = (
        "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev"
    )
    molit_apt_trade_endpoint: str = (
        "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade"
    )
    molit_apt_rent_endpoint: str = (
        "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent"
    )
    molit_row_house_trade_endpoint: str = (
        "https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade"
    )
    molit_detached_house_trade_endpoint: str = (
        "https://apis.data.go.kr/1613000/RTMSDataSvcSHTrade"
    )
    molit_officetel_trade_endpoint: str = (
        "https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade"
    )

    # K-MOOC 강좌 엔드포인트
    kmooc_lecture_endpoint: str = "https://apis.data.go.kr/B552881/kmooc_v2_0"

    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]


@lru_cache
def get_settings() -> Settings:
    """설정 싱글턴 반환."""
    return Settings()


settings = get_settings()
