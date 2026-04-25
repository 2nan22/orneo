# ai_service/schemas/decision.py
"""DecisionStudio 요청/응답 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DecisionContext(BaseModel):
    """시나리오 생성을 위한 사용자 컨텍스트."""

    category: str = Field(..., description="결정 카테고리 (housing/investment/learning/routine)")
    user_goals: list[str] = Field(default_factory=list, description="관련 목표 제목 목록")
    recent_data: list[str] = Field(default_factory=list, description="관련 데이터 포인트 (예: 실거래가 변화)")


class DecisionScenariosRequest(BaseModel):
    """시나리오 생성 요청."""

    topic: str = Field(..., description="의사결정 주제 (예: 성동구 전세 vs 외곽 매수)")
    context: DecisionContext


class Scenario(BaseModel):
    """단일 시나리오."""

    id: str = Field(..., description="A / B / C")
    title: str = Field(..., description="시나리오 제목 (10자 이내)")
    risk: str = Field(..., description="높음 / 중간 / 낮음")
    description: str = Field(..., description="한 줄 설명 (40자 이내)")


class DecisionScenariosResponse(BaseModel):
    """시나리오 생성 응답."""

    topic: str
    evidence_chips: list[str] = Field(..., description="근거 데이터 칩 레이블 목록")
    scenarios: list[Scenario]
    model_used: str
    disclaimer: str = "이 시뮬레이션은 참고용이며 투자·부동산 권유가 아닙니다."
