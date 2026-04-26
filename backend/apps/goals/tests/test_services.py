# backend/apps/goals/tests/test_services.py
"""목표 서비스 테스트."""

from __future__ import annotations

import pytest

from apps.accounts.models import CustomUser
from apps.goals.exceptions import GoalPermissionError
from apps.goals.models import Goal, GoalCategory
from apps.goals.services import create_goal, update_goal


@pytest.fixture
def user_a(db) -> CustomUser:
    """테스트용 사용자 A 픽스처."""
    return CustomUser.objects.create_user(
        username="user_a", email="user_a@example.com", password="pass123!"
    )


@pytest.fixture
def user_b(db) -> CustomUser:
    """테스트용 사용자 B 픽스처."""
    return CustomUser.objects.create_user(
        username="user_b", email="user_b@example.com", password="pass123!"
    )


@pytest.mark.django_db
def test_create_goal_success(user_a: CustomUser) -> None:
    """목표 생성이 정상적으로 동작한다."""
    goal = create_goal(
        user=user_a,
        category=GoalCategory.FINANCIAL,
        title="비상금 1000만원 모으기",
    )

    assert isinstance(goal, Goal)
    assert goal.user == user_a
    assert goal.category == GoalCategory.FINANCIAL
    assert goal.progress == 0.0
    assert goal.is_active is True


@pytest.mark.django_db
def test_create_goal_with_amount(user_a: CustomUser) -> None:
    """금액 포함 목표 생성이 정상적으로 동작한다."""
    goal = create_goal(
        user=user_a,
        category=GoalCategory.FINANCIAL,
        title="비상금 목표",
        target_amount=10_000_000,
    )

    assert goal.target_amount == 10_000_000


@pytest.mark.django_db
def test_update_goal_progress_success(user_a: CustomUser) -> None:
    """목표 진척도 업데이트가 정상적으로 동작한다."""
    goal = create_goal(
        user=user_a,
        category=GoalCategory.LEARNING,
        title="독서 12권 완독",
    )

    updated = update_goal(goal_id=goal.pk, user=user_a, data={"progress": 0.5})

    assert updated.progress == 0.5


@pytest.mark.django_db
def test_deactivate_goal(user_a: CustomUser) -> None:
    """목표 비활성화가 정상적으로 동작한다."""
    goal = create_goal(
        user=user_a,
        category=GoalCategory.ROUTINE,
        title="매일 운동 30분",
    )

    updated = update_goal(goal_id=goal.pk, user=user_a, data={"is_active": False})

    assert updated.is_active is False


@pytest.mark.django_db
def test_update_goal_raises_for_other_user(
    user_a: CustomUser, user_b: CustomUser
) -> None:
    """다른 사용자의 목표 수정 시 GoalPermissionError가 발생한다."""
    goal = create_goal(
        user=user_a,
        category=GoalCategory.ROUTINE,
        title="매일 운동 30분",
    )

    with pytest.raises(GoalPermissionError):
        update_goal(goal_id=goal.pk, user=user_b, data={"progress": 0.3})
