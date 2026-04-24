# backend/apps/reports/tests/test_services.py
"""주간 복기 리포트 서비스 테스트."""

from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from apps.accounts.models import CustomUser
from apps.goals.models import Goal, GoalCategory
from apps.reports.exceptions import ReportAlreadyExistsError
from apps.reports.models import WeeklyReport
from apps.reports.services import generate_weekly_report


@pytest.fixture
def user_with_goals(db) -> CustomUser:
    """목표가 있는 테스트 사용자."""
    user = CustomUser.objects.create_user(
        username="goals_user", email="goals@example.com", password="pass123!"
    )
    Goal.objects.create(
        user=user,
        category=GoalCategory.FINANCIAL,
        title="비상금 마련",
        progress=1.0,
        is_active=True,
    )
    Goal.objects.create(
        user=user,
        category=GoalCategory.LEARNING,
        title="Python 마스터",
        progress=0.3,
        is_active=True,
    )
    return user


@pytest.mark.django_db
def test_generate_weekly_report_creates_report(user_with_goals: CustomUser) -> None:
    """generate_weekly_report가 정상적으로 WeeklyReport를 생성하는지 검증."""
    week_start = date(2025, 1, 6)

    with patch("apps.dashboard.services.calculate_capital_score") as mock_score:
        mock_result = MagicMock()
        mock_result.capital_score = 65.0
        mock_score.return_value = mock_result

        report = generate_weekly_report(user=user_with_goals, week_start=week_start)

    assert isinstance(report, WeeklyReport)
    assert report.user == user_with_goals
    assert report.week_start == week_start
    assert report.week_end == date(2025, 1, 12)
    assert report.capital_score == 65
    assert 0.0 <= report.goal_achievement_rate <= 1.0
    assert report.journal_count >= 0


@pytest.mark.django_db
def test_generate_weekly_report_goal_achievement_rate(user_with_goals: CustomUser) -> None:
    """목표 달성률이 달성 목표 / 전체 목표로 계산되는지 검증."""
    week_start = date(2025, 1, 6)

    with patch("apps.dashboard.services.calculate_capital_score") as mock_score:
        mock_result = MagicMock()
        mock_result.capital_score = 50.0
        mock_score.return_value = mock_result

        report = generate_weekly_report(user=user_with_goals, week_start=week_start)

    # 목표 2개 중 1개(progress=1.0) 달성 → 0.5
    assert report.goal_achievement_rate == 0.5


@pytest.mark.django_db
def test_generate_weekly_report_raises_if_already_exists(user_with_goals: CustomUser) -> None:
    """같은 주차 리포트 재생성 시 ReportAlreadyExistsError가 발생하는지 검증."""
    week_start = date(2025, 1, 6)

    with patch("apps.dashboard.services.calculate_capital_score") as mock_score:
        mock_result = MagicMock()
        mock_result.capital_score = 50.0
        mock_score.return_value = mock_result

        generate_weekly_report(user=user_with_goals, week_start=week_start)

        with pytest.raises(ReportAlreadyExistsError):
            generate_weekly_report(user=user_with_goals, week_start=week_start)


@pytest.mark.django_db
def test_generate_weekly_report_no_goals(db) -> None:
    """목표가 없는 사용자의 리포트 생성이 0.0 달성률로 처리되는지 검증."""
    user = CustomUser.objects.create_user(
        username="no_goals_user", email="nogoals@example.com", password="pass123!"
    )
    week_start = date(2025, 1, 6)

    with patch("apps.dashboard.services.calculate_capital_score") as mock_score:
        mock_result = MagicMock()
        mock_result.capital_score = 0.0
        mock_score.return_value = mock_result

        report = generate_weekly_report(user=user, week_start=week_start)

    assert report.goal_achievement_rate == 0.0
