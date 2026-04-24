# ai_service/utils/http_client.py
"""httpx AsyncClient 싱글턴 관리."""

from __future__ import annotations

import logging

import httpx

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None


async def init_http_client() -> None:
    """앱 시작 시 AsyncClient를 초기화한다."""
    global _client
    _client = httpx.AsyncClient(timeout=30.0)
    logger.info("HTTP client initialized.")


async def close_http_client() -> None:
    """앱 종료 시 AsyncClient를 닫는다."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("HTTP client closed.")


def get_http_client() -> httpx.AsyncClient:
    """현재 AsyncClient 인스턴스를 반환한다.

    Returns:
        초기화된 AsyncClient.

    Raises:
        RuntimeError: 클라이언트가 초기화되지 않은 경우.
    """
    if _client is None:
        raise RuntimeError("HTTP client is not initialized. Call init_http_client() first.")
    return _client
