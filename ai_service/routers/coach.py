# ai_service/routers/coach.py
"""Gemma 로컬 코치 라우터."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from schemas.coach import ActionItem, CoachRequest, CoachResponse, DailyActionsRequest, DailyActionsResponse
from services.gemma_client import GemmaClient, get_gemma_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/summarize",
    response_model=CoachResponse,
    summary="일지 요약 및 행동 제안",
)
async def summarize_journal(
    request: CoachRequest,
    client: GemmaClient = Depends(get_gemma_client),
) -> CoachResponse:
    """사용자 일지를 로컬 Gemma 모델로 요약하고 오늘의 행동을 제안한다.

    Ollama가 응답하지 않으면 규칙 기반 fallback 응답을 반환한다 (503 아님).

    Args:
        request: 일지 내용과 사용자 컨텍스트.
        client: Gemma 클라이언트 (DI).

    Returns:
        요약 텍스트, 추천 행동 목록, 사용된 모델명.
    """
    try:
        result = await client.summarize(request.journal_text, request.context)
        return CoachResponse(
            summary=result.summary,
            actions=result.actions,
            model_used=result.model_used,
        )
    except Exception as exc:
        logger.exception("Gemma summarize 예기치 못한 오류: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="코치 서비스에서 오류가 발생했습니다.",
        ) from exc
    finally:
        await client.close()


@router.post(
    "/daily-actions",
    response_model=DailyActionsResponse,
    summary="오늘의 행동 3개 + 핵심 질문 생성",
)
async def generate_daily_actions(
    request: DailyActionsRequest,
    client: GemmaClient = Depends(get_gemma_client),
) -> DailyActionsResponse:
    """사용자의 목표·일지 맥락을 바탕으로 오늘 할 행동 3개와 핵심 질문을 생성한다.

    Ollama 미응답 시 규칙 기반 fallback을 반환한다 (503 아님).

    Args:
        request: 목표 목록, 최근 일지 요약, 투자 성향.
        client: Gemma 클라이언트 (DI).

    Returns:
        행동 3개, 핵심 질문, 사용 모델명.
    """
    try:
        result = await client.generate_daily_actions(
            goals=[g.model_dump() for g in request.goals],
            recent_summaries=request.recent_journal_summaries,
            risk_tolerance=request.risk_tolerance,
            preferred_model=request.preferred_model,
        )
        return DailyActionsResponse(
            actions=[ActionItem(**a) for a in result.actions],
            key_question=result.key_question,
            model_used=result.model_used,
        )
    except Exception as exc:
        logger.exception("daily-actions 예기치 못한 오류: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="행동 생성 서비스에서 오류가 발생했습니다.",
        ) from exc
    finally:
        await client.close()
