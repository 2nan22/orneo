# backend/config/exceptions.py
"""DRF 커스텀 예외 핸들러."""

from __future__ import annotations

import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc: Exception, context: dict) -> Response | None:
    """표준 에러 응답 포맷으로 변환한다.

    Args:
        exc: 발생한 예외.
        context: DRF 컨텍스트.

    Returns:
        표준 에러 응답 또는 None.
    """
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            "status": "error",
            "code": response.data.get("code", "ERROR"),
            "message": _extract_message(response.data),
            "detail": None,
        }

    return response


def _extract_message(data: dict | list | str) -> str:
    """응답 데이터에서 첫 번째 메시지를 추출한다."""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return str(data[0]) if data else "오류가 발생했습니다."
    if isinstance(data, dict):
        for value in data.values():
            return _extract_message(value)
    return "오류가 발생했습니다."
