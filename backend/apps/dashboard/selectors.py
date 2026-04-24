# backend/apps/dashboard/selectors.py
"""라이프 캐피털 대시보드 읽기 전용 쿼리."""

from __future__ import annotations

from django.db.models import QuerySet

from apps.dashboard.models import CapitalScoreSnapshot


def get_latest_snapshot(*, user_id: int) -> CapitalScoreSnapshot | None:
    """가장 최근 캐피털 점수 스냅샷을 반환한다.

    Args:
        user_id: 사용자 PK.

    Returns:
        최신 CapitalScoreSnapshot 또는 None.
    """
    return CapitalScoreSnapshot.objects.filter(user_id=user_id).first()


def get_score_history(*, user_id: int, limit: int = 30) -> QuerySet[CapitalScoreSnapshot]:
    """점수 히스토리를 반환한다.

    Args:
        user_id: 사용자 PK.
        limit: 조회할 최대 개수 (기본 30일).

    Returns:
        CapitalScoreSnapshot QuerySet.
    """
    return CapitalScoreSnapshot.objects.filter(user_id=user_id)[:limit]
