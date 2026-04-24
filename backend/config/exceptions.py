# backend/config/exceptions.py
"""DRF 커스텀 예외 핸들러."""

from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

# 커스텀 예외 → (HTTP 상태코드, 에러코드) 매핑
# 앱 로딩 순서 문제를 피하기 위해 지연 임포트 방식으로 처리
_EXCEPTION_MAP: dict[str, tuple[int, str]] | None = None


def _get_exception_map() -> dict[str, tuple[int, str]]:
    """커스텀 예외 매핑을 지연 로드한다."""
    global _EXCEPTION_MAP
    if _EXCEPTION_MAP is None:
        from apps.accounts.exceptions import AccountNotFoundError, OnboardingAlreadyDoneError
        from apps.goals.exceptions import GoalNotFoundError, GoalPermissionError

        _EXCEPTION_MAP = {
            f"{AccountNotFoundError.__module__}.{AccountNotFoundError.__name__}": (
                status.HTTP_404_NOT_FOUND,
                "ACCOUNT_NOT_FOUND",
            ),
            f"{OnboardingAlreadyDoneError.__module__}.{OnboardingAlreadyDoneError.__name__}": (
                status.HTTP_409_CONFLICT,
                "ONBOARDING_ALREADY_DONE",
            ),
            f"{GoalNotFoundError.__module__}.{GoalNotFoundError.__name__}": (
                status.HTTP_404_NOT_FOUND,
                "GOAL_NOT_FOUND",
            ),
            f"{GoalPermissionError.__module__}.{GoalPermissionError.__name__}": (
                status.HTTP_403_FORBIDDEN,
                "GOAL_PERMISSION_DENIED",
            ),
        }
    return _EXCEPTION_MAP


def custom_exception_handler(exc: Exception, context: dict) -> Response | None:
    """커스텀 예외를 표준 에러 응답으로 변환한다.

    Args:
        exc: 발생한 예외.
        context: DRF 컨텍스트.

    Returns:
        표준 에러 응답 또는 None.
    """
    exc_key = f"{exc.__class__.__module__}.{exc.__class__.__name__}"
    exception_map = _get_exception_map()

    if exc_key in exception_map:
        http_status, error_code = exception_map[exc_key]
        logger.warning("비즈니스 예외 발생: %s", exc.__class__.__name__)
        return Response(
            {"status": "error", "code": error_code, "message": str(exc), "detail": None},
            status=http_status,
        )

    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            "status": "error",
            "code": response.data.get("code", "ERROR") if isinstance(response.data, dict) else "ERROR",
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
