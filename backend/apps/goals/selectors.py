# backend/apps/goals/selectors.py
"""목표 읽기 전용 쿼리."""

from __future__ import annotations

from django.db.models import QuerySet

from apps.accounts.models import CustomUser
from apps.goals.exceptions import GoalNotFoundError, GoalPermissionError
from apps.goals.models import Goal


def get_user_goals(
    *,
    user: CustomUser,
    category: str | None = None,
    is_active: bool | None = None,
) -> QuerySet[Goal]:
    """사용자의 목표 목록을 반환한다.

    Args:
        user: 조회 대상 사용자.
        category: 필터링할 카테고리 (None이면 전체).
        is_active: 활성 여부 필터 (None이면 전체).

    Returns:
        Goal QuerySet (최신순 정렬).
    """
    qs = Goal.objects.filter(user=user)
    if category is not None:
        qs = qs.filter(category=category)
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    return qs


def get_active_goals(*, user: CustomUser) -> QuerySet[Goal]:
    """사용자의 활성 목표 목록을 반환한다.

    Args:
        user: 조회 대상 사용자.

    Returns:
        활성 Goal QuerySet.
    """
    return Goal.objects.filter(user=user, is_active=True)


def get_goal_or_raise(*, goal_id: int, user: CustomUser) -> Goal:
    """목표를 조회하거나 커스텀 예외를 발생시킨다.

    Args:
        goal_id: 조회할 목표 ID.
        user: 요청 사용자 (권한 검증용).

    Returns:
        Goal 인스턴스.

    Raises:
        GoalNotFoundError: 목표가 존재하지 않는 경우.
        GoalPermissionError: 다른 사용자의 목표인 경우.
    """
    try:
        goal = Goal.objects.get(pk=goal_id)
    except Goal.DoesNotExist as exc:
        raise GoalNotFoundError(f"목표를 찾을 수 없습니다: id={goal_id}") from exc
    if goal.user_id != user.pk:
        raise GoalPermissionError("접근 권한이 없습니다.")
    return goal
