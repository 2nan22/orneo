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


class GoalSummary(BaseModel):
    """목표 요약 (daily-actions 입력용)."""

    category: str = Field(..., description="목표 카테고리 (financial/housing/learning/routine)")
    title: str = Field(..., description="목표 제목")
    progress: float = Field(..., ge=0.0, le=1.0, description="진척도 0.0~1.0")


class DailyActionsRequest(BaseModel):
    """일일 행동 생성 요청."""

    goals: list[GoalSummary] = Field(default_factory=list, description="활성 목표 목록")
    recent_journal_summaries: list[str] = Field(
        default_factory=list,
        max_length=3,
        description="최근 3일 일지 요약 (ai_summary 필드)",
    )
    risk_tolerance: str = Field(default="moderate", description="투자 성향")
    preferred_model: str = Field(
        default="auto",
        description="사용자 선호 모델 (auto/gemma/qwen/server)",
    )


class ActionItem(BaseModel):
    """오늘 할 행동 한 개."""

    text: str = Field(..., description="행동 설명 (30자 이내 권장)")
    category: str = Field(..., description="카테고리 (financial/housing/learning/routine/general 중 하나)")


class DailyActionsResponse(BaseModel):
    """일일 행동 생성 응답."""

    actions: list[ActionItem] = Field(..., description="오늘 할 행동 3개")
    key_question: str = Field(..., description="오늘의 핵심 질문 1개")
    model_used: str = Field(..., description="사용된 모델명 또는 'fallback'")
