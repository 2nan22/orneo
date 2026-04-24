# backend/apps/reports/tests/conftest.py
"""주간 복기 리포트 테스트 공통 픽스처."""

from __future__ import annotations

from datetime import date

import pytest

from apps.accounts.models import CustomUser
from apps.reports.models import WeeklyReport


@pytest.fixture
def user(db) -> CustomUser:
    """테스트용 사용자 픽스처."""
    return CustomUser.objects.create_user(
        username="report_user", email="report@example.com", password="pass123!"
    )


@pytest.fixture
def week_start() -> date:
    """테스트용 주 시작일 (월요일)."""
    return date(2025, 1, 6)


@pytest.fixture
def weekly_report(user: CustomUser, week_start: date) -> WeeklyReport:
    """테스트용 주간 리포트 픽스처."""
    return WeeklyReport.objects.create(
        user=user,
        week_start=week_start,
        week_end=date(2025, 1, 12),
        capital_score=72,
        goal_achievement_rate=0.5,
        journal_count=3,
        action_completion_rate=0.6,
        highlights=["목표 달성률 50%로 절반 이상 달성"],
        improvements=["행동 완료율 60% — 복기 습관 강화 필요"],
        next_week_action="일지 복기를 통해 지난주 행동 중 1가지를 개선해보세요.",
    )
