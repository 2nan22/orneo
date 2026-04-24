# ai_service/schemas/coach.py
"""Gemma 로컬 코치 요청/응답 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CoachRequest(BaseModel):
    """코치 요청 스키마."""

    journal_text: str = Field(..., description="사용자가 작성한 일지 본문")
    context: dict = Field(default_factory=dict, description="사용자 목표·감정 컨텍스트")


class CoachResponse(BaseModel):
    """코치 응답 스키마."""

    summary: str = Field(..., description="일지 요약 (2~3문장)")
    actions: list[str] = Field(..., description="오늘 할 행동 1~3개")
    model_used: str = Field(..., description="사용된 모델명 또는 'fallback'")
