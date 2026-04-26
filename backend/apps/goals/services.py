# backend/apps/goals/services.py
"""목표 비즈니스 로직."""

from __future__ import annotations

import logging
from typing import Any

from django.db import transaction

from apps.accounts.models import CustomUser
from apps.goals.models import Goal
from apps.goals.selectors import get_goal_or_raise

logger = logging.getLogger(__name__)


@transaction.atomic
def create_goal(
    *,
    user: CustomUser,
    category: str,
    title: str,
    description: str = "",
    target_date: str | None = None,
    target_amount: int | None = None,
) -> Goal:
    """목표를 생성한다.

    Args:
        user: 목표 소유자.
        category: 목표 카테고리.
        title: 목표 제목.
        description: 상세 설명.
        target_date: 달성 기한 (YYYY-MM-DD).
        target_amount: 목표 금액.

    Returns:
        생성된 Goal 인스턴스.
    """
    goal = Goal.objects.create(
        user=user,
        category=category,
        title=title,
        description=description,
        target_date=target_date,
        target_amount=target_amount,
    )
    logger.info("목표 생성 완료: id=%d user_id=%d category=%s", goal.pk, user.pk, category)
    return goal


@transaction.atomic
def update_goal(
    *,
    goal_id: int,
    user: CustomUser,
    data: dict[str, Any],
) -> Goal:
    """목표 필드를 업데이트한다.

    Args:
        goal_id: 업데이트할 목표 ID.
        user: 요청 사용자.
        data: 업데이트할 필드 딕셔너리 (validated_data).

    Returns:
        업데이트된 Goal 인스턴스.
    """
    goal = get_goal_or_raise(goal_id=goal_id, user=user)
    update_fields = []
    for field, value in data.items():
        setattr(goal, field, value)
        update_fields.append(field)
    update_fields.append("updated_at")
    goal.save(update_fields=update_fields)
    logger.info("목표 수정 완료: id=%d user_id=%d", goal.pk, user.pk)
    return goal
