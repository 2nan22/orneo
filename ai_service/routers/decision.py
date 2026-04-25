# ai_service/routers/decision.py
"""DecisionStudio 시나리오 생성 라우터."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from schemas.decision import DecisionScenariosRequest, DecisionScenariosResponse, Scenario
from services.gemma_client import GemmaClient, get_gemma_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/scenarios",
    response_model=DecisionScenariosResponse,
    summary="A/B/C 의사결정 시나리오 생성",
)
async def generate_decision_scenarios(
    request: DecisionScenariosRequest,
    client: GemmaClient = Depends(get_gemma_client),
) -> DecisionScenariosResponse:
    """의사결정 주제와 컨텍스트를 받아 A/B/C 3가지 시나리오를 생성한다.

    Ollama 미응답 시 규칙 기반 fallback 반환 (503 아님).
    결과에는 반드시 면책 고지(disclaimer)가 포함된다.

    Args:
        request: 주제, 카테고리, 목표, 참고 데이터.
        client: Gemma 클라이언트 (DI).

    Returns:
        시나리오 3개, 근거 칩, 면책 고지.
    """
    try:
        result = await client.generate_scenarios(
            topic=request.topic,
            context=request.context.model_dump(),
        )
        return DecisionScenariosResponse(
            topic=result.topic,
            evidence_chips=result.evidence_chips,
            scenarios=[Scenario(**s) for s in result.scenarios],
            model_used=result.model_used,
        )
    except Exception as exc:
        logger.exception("scenarios 예기치 못한 오류: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시나리오 생성 서비스에서 오류가 발생했습니다.",
        ) from exc
    finally:
        await client.close()
