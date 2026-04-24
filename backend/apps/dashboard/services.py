# backend/apps/dashboard/services.py
"""라이프 캐피털 점수 계산 서비스."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import CustomUser

logger = logging.getLogger(__name__)

_WEIGHT_ASSET = 0.4
_WEIGHT_GOAL = 0.4
_WEIGHT_ROUTINE = 0.2
_ROUTINE_MAX_DAYS = 7


@dataclass(frozen=True)
class CapitalScoreResult:
    """점수 계산 결과.

    Attributes:
        capital_score: 종합 점수 (0~100).
        asset_stability: 자산 안정성 점수 (0~100).
        goal_progress: 목표 진척도 점수 (0~100).
        routine_score: 루틴 점수 (0~100).
        active_goals_count: 활성 목표 수.
        recent_journal_count: 최근 7일 일지 수.
    """

    capital_score: float
    asset_stability: float
    goal_progress: float
    routine_score: float
    active_goals_count: int
    recent_journal_count: int


def calculate_capital_score(*, user: CustomUser) -> CapitalScoreResult:
    """라이프 캐피털 종합 점수를 계산하고 일별 스냅샷을 저장한다.

    - 자산 안정성 40%: financial 카테고리 활성 목표 progress 평균
    - 목표 진척도 40%: 전체 활성 목표 progress 평균
    - 루틴 점수 20%: 최근 7일 일지 작성 수 / 7

    Args:
        user: 점수를 계산할 사용자.

    Returns:
        CapitalScoreResult 계산 결과.
    """
    from apps.goals.models import Goal, GoalCategory
    from apps.journal.selectors import get_recent_journal_count

    active_goals = list(
        Goal.objects.filter(user=user, is_active=True).values("category", "progress")
    )

    financial_goals = [g for g in active_goals if g["category"] == GoalCategory.FINANCIAL]
    asset_stability_raw = (
        sum(g["progress"] for g in financial_goals) / len(financial_goals)
        if financial_goals
        else 0.0
    )

    goal_progress_raw = (
        sum(g["progress"] for g in active_goals) / len(active_goals)
        if active_goals
        else 0.0
    )

    recent_count = get_recent_journal_count(user_id=user.pk, days=_ROUTINE_MAX_DAYS)
    routine_score_raw = min(recent_count / _ROUTINE_MAX_DAYS, 1.0)

    asset_stability = round(asset_stability_raw * 100, 2)
    goal_progress = round(goal_progress_raw * 100, 2)
    routine_score = round(routine_score_raw * 100, 2)
    capital_score = round(
        asset_stability * _WEIGHT_ASSET
        + goal_progress * _WEIGHT_GOAL
        + routine_score * _WEIGHT_ROUTINE,
        2,
    )

    _save_snapshot(
        user=user,
        capital_score=capital_score,
        asset_stability=asset_stability,
        goal_progress=goal_progress,
        routine_score=routine_score,
    )

    logger.info(
        "캐피털 점수 계산 완료: user_id=%d score=%.2f", user.pk, capital_score
    )

    return CapitalScoreResult(
        capital_score=capital_score,
        asset_stability=asset_stability,
        goal_progress=goal_progress,
        routine_score=routine_score,
        active_goals_count=len(active_goals),
        recent_journal_count=recent_count,
    )


@transaction.atomic
def _save_snapshot(
    *,
    user: CustomUser,
    capital_score: float,
    asset_stability: float,
    goal_progress: float,
    routine_score: float,
) -> None:
    """일별 점수 스냅샷을 저장(upsert)한다."""
    from apps.dashboard.models import CapitalScoreSnapshot

    today = timezone.localdate()
    CapitalScoreSnapshot.objects.update_or_create(
        user=user,
        score_date=today,
        defaults={
            "capital_score": capital_score,
            "asset_stability": asset_stability,
            "goal_progress": goal_progress,
            "routine_score": routine_score,
        },
    )
