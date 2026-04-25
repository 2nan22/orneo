# backend/apps/dashboard/selectors.py
"""라이프 캐피털 대시보드 읽기 전용 쿼리."""

from __future__ import annotations

from apps.dashboard.models import CapitalScoreSnapshot


def get_active_goals(*, user_id: int) -> list[dict]:
    """사용자의 활성 목표 목록을 반환한다.

    Args:
        user_id: 사용자 PK.

    Returns:
        category와 progress 키를 가진 dict 리스트.
    """
    from apps.goals.models import Goal

    return list(Goal.objects.filter(user_id=user_id, is_active=True).values("category", "progress"))


def get_latest_snapshot(*, user_id: int) -> CapitalScoreSnapshot | None:
    """가장 최근 캐피털 점수 스냅샷을 반환한다.

    Args:
        user_id: 사용자 PK.

    Returns:
        최신 CapitalScoreSnapshot 또는 None.
    """
    return CapitalScoreSnapshot.objects.filter(user_id=user_id).first()


def get_score_history(*, user_id: int, limit: int = 30) -> list[CapitalScoreSnapshot]:
    """점수 히스토리를 반환한다.

    Args:
        user_id: 사용자 PK.
        limit: 조회할 최대 개수 (기본 30일).

    Returns:
        CapitalScoreSnapshot 리스트 (슬라이싱 후 추가 체이닝 불가 방지).
    """
    return list(CapitalScoreSnapshot.objects.filter(user_id=user_id)[:limit])
