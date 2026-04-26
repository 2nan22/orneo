# backend/apps/reports/tests/test_views.py
"""주간 복기 리포트 뷰 테스트."""

from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser
from apps.reports.models import WeeklyReport


@pytest.fixture
def api_client() -> APIClient:
    """DRF API 테스트 클라이언트."""
    return APIClient()


@pytest.fixture
def user(db) -> CustomUser:
    """테스트 사용자."""
    return CustomUser.objects.create_user(
        username="view_user", email="view@example.com", password="pass123!"
    )


@pytest.fixture
def auth_client(api_client: APIClient, user: CustomUser) -> APIClient:
    """인증된 API 클라이언트."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def report(user: CustomUser) -> WeeklyReport:
    """테스트용 주간 리포트."""
    return WeeklyReport.objects.create(
        user=user,
        week_start=date(2025, 1, 6),
        week_end=date(2025, 1, 12),
        capital_score=70,
        goal_achievement_rate=0.5,
        journal_count=2,
        action_completion_rate=0.5,
        highlights=["꾸준한 기록 유지"],
        improvements=["행동 완료율 개선 필요"],
        next_week_action="일지 복기를 통해 1가지 개선",
    )


@pytest.mark.django_db
def test_weekly_report_list_empty(auth_client: APIClient) -> None:
    """리포트가 없을 때 빈 목록을 반환하는지 검증."""
    response = auth_client.get("/api/v1/reports/weekly/")
    assert response.status_code == 200
    assert response.data["status"] == "success"
    assert response.data["data"] == []


@pytest.mark.django_db
def test_weekly_report_list_with_data(auth_client: APIClient, report: WeeklyReport) -> None:
    """리포트가 있을 때 목록을 반환하는지 검증."""
    response = auth_client.get("/api/v1/reports/weekly/")
    assert response.status_code == 200
    assert len(response.data["data"]) == 1
    assert response.data["data"][0]["capital_score"] == 70


@pytest.mark.django_db
def test_weekly_report_latest(auth_client: APIClient, report: WeeklyReport) -> None:
    """최신 리포트 조회가 정상 동작하는지 검증."""
    response = auth_client.get("/api/v1/reports/weekly/latest/")
    assert response.status_code == 200
    assert response.data["data"]["week_start"] == "2025-01-06"


@pytest.mark.django_db
def test_weekly_report_latest_not_found(auth_client: APIClient) -> None:
    """리포트가 없을 때 404를 반환하는지 검증."""
    response = auth_client.get("/api/v1/reports/weekly/latest/")
    assert response.status_code == 404
    assert response.data["code"] == "REPORT_NOT_FOUND"


@pytest.mark.django_db
def test_weekly_report_generate(auth_client: APIClient) -> None:
    """수동 리포트 생성이 정상 동작하는지 검증."""
    with patch("apps.dashboard.services.calculate_capital_score") as mock_score:
        mock_result = MagicMock()
        mock_result.capital_score = 55.0
        mock_score.return_value = mock_result

        response = auth_client.post(
            "/api/v1/reports/weekly/generate/",
            data={"week_start": "2025-01-13"},
            format="json",
        )

    assert response.status_code == 201
    assert response.data["status"] == "success"
    assert response.data["data"]["capital_score"] == 55


@pytest.mark.django_db
def test_weekly_report_generate_invalid_day(auth_client: APIClient) -> None:
    """월요일이 아닌 날짜로 생성 시 400을 반환하는지 검증."""
    response = auth_client.post(
        "/api/v1/reports/weekly/generate/",
        data={"week_start": "2025-01-07"},  # 화요일
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_weekly_report_requires_auth(api_client: APIClient) -> None:
    """인증 없이 접근 시 401을 반환하는지 검증."""
    response = api_client.get("/api/v1/reports/weekly/")
    assert response.status_code == 401
