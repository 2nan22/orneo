# ai_service/routers/health.py
"""헬스체크 라우터."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

VERSION = "0.1.0"


class HealthResponse(BaseModel):
    """헬스체크 응답 스키마."""

    status: str
    version: str


@router.get("/health", response_model=HealthResponse, summary="헬스체크")
async def health_check() -> HealthResponse:
    """서비스 상태를 반환한다.

    Returns:
        status와 version을 포함한 응답.
    """
    return HealthResponse(status="ok", version=VERSION)
