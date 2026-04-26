# backend/apps/dashboard/tests/test_services.py
"""라이프 캐피털 점수 서비스 테스트."""

from __future__ import annotations

import pytest

from apps.accounts.models import CustomUser
from apps.dashboard.models import CapitalScoreSnapshot
from apps.dashboard.services import CapitalScoreResult, calculate_capital_score
from apps.goals.models import Goal, GoalCategory
from apps.journal.models import JournalCategory, JournalEntry


@pytest.fixture
def user(db) -> CustomUser:
    """테스트용 사용자 픽스처."""
    return CustomUser.objects.create_user(
        username="dash_user", email="dash@example.com", password="pass123!"
    )


@pytest.mark.django_db
def test_calculate_capital_score_no_data(user: CustomUser) -> None:
    """목표·일지가 없을 때 점수는 0이다."""
    result = calculate_capital_score(user=user)

    assert isinstance(result, CapitalScoreResult)
    assert result.capital_score == 0.0
    assert result.active_goals_count == 0
    assert result.recent_journal_count == 0


@pytest.mark.django_db
def test_calculate_capital_score_with_goals(user: CustomUser) -> None:
    """활성 목표가 있을 때 goal_progress 점수가 반영된다."""
    Goal.objects.create(
        user=user, category=GoalCategory.FINANCIAL, title="목표1", progress=0.8
    )
    Goal.objects.create(
        user=user, category=GoalCategory.LEARNING, title="목표2", progress=0.6
    )

    result = calculate_capital_score(user=user)

    assert result.active_goals_count == 2
    assert result.goal_progress == pytest.approx(70.0)
    assert result.asset_stability == pytest.approx(80.0)


@pytest.mark.django_db
def test_calculate_capital_score_with_journals(user: CustomUser) -> None:
    """최근 7일 일지 7개 작성 시 routine_score가 100이다."""
    for i in range(7):
        JournalEntry.objects.create(
            user=user,
            category=JournalCategory.ROUTINE,
            title=f"일지 {i}",
            content="내용",
        )

    result = calculate_capital_score(user=user)

    assert result.recent_journal_count == 7
    assert result.routine_score == pytest.approx(100.0)


@pytest.mark.django_db
def test_calculate_capital_score_saves_snapshot(user: CustomUser) -> None:
    """점수 계산 시 일별 스냅샷이 DB에 저장된다."""
    calculate_capital_score(user=user)

    assert CapitalScoreSnapshot.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_calculate_capital_score_upserts_snapshot(user: CustomUser) -> None:
    """같은 날 재계산 시 스냅샷을 덮어쓴다."""
    calculate_capital_score(user=user)
    calculate_capital_score(user=user)

    assert CapitalScoreSnapshot.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_get_delta_no_snapshot_returns_none(user: CustomUser) -> None:
    """스냅샷이 없으면 _get_delta는 None을 반환한다."""
    from django.utils import timezone

    from apps.dashboard.views import _get_delta

    today = timezone.localdate()
    result = _get_delta(user=user, today=today)

    assert result is None


@pytest.mark.django_db
def test_get_delta_with_single_snapshot_returns_none(user: CustomUser) -> None:
    """오늘 스냅샷만 있고 비교 기준 스냅샷이 없으면 None을 반환한다."""
    from django.utils import timezone

    from apps.dashboard.views import _get_delta

    today = timezone.localdate()
    CapitalScoreSnapshot.objects.create(
        user=user,
        score_date=today,
        capital_score=50.0,
        asset_stability=60.0,
        goal_progress=40.0,
        routine_score=30.0,
    )

    result = _get_delta(user=user, today=today)

    assert result is None
