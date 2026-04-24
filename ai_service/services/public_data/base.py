# ai_service/services/public_data/base.py
"""공공 데이터 클라이언트 베이스 클래스."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
MAX_RETRY = 3


class PublicDataClient(ABC):
    """공공 데이터 API 클라이언트 추상 베이스 클래스.

    모든 공공 데이터 클라이언트는 이 클래스를 상속받아
    fetch_raw() 메서드를 구현해야 한다.
    """

    def __init__(self, api_key: str, base_url: str) -> None:
        """클라이언트 초기화.

        Args:
            api_key: 공공데이터포털 인증 키.
            base_url: API 기본 URL.
        """
        self._api_key = api_key
        self._base_url = base_url
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        """HTTP 클라이언트 (지연 초기화)."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=DEFAULT_TIMEOUT,
            )
        return self._client

    @abstractmethod
    async def fetch_raw(self, **kwargs: Any) -> dict:
        """원본 API 응답을 반환한다."""
        ...

    async def close(self) -> None:
        """HTTP 클라이언트를 정리한다."""
        if self._client:
            await self._client.aclose()
            self._client = None
