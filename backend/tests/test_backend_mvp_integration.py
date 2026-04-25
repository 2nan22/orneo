# backend/tests/test_backend_mvp_integration.py
"""백엔드 MVP E2E 통합 테스트.

Session 03~06 기능 전체가 연동되는지 확인하는 시나리오 테스트:
  1. 회원가입 → 온보딩
  2. 목표 3개 생성 (financial, housing, learning)
  3. 일지 2개 작성
  4. 대시보드 점수 조회
  5. 주간 리포트 수동 생성 → 조회
"""

from __future__ import annotations

from datetime import date
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import CustomUser, RiskTolerance
from apps.accounts.services import complete_onboarding
from apps.dashboard.selectors import get_latest_snapshot
from apps.goals.models import GoalCategory
from apps.goals.services import create_goal
from apps.journal.models import JournalCategory
from apps.journal.services import create_journal
from apps.reports.selectors import get_latest_report


@pytest.fixture
def api_client() -> APIClient:
    """DRF API 클라이언트."""
    return APIClient()


@pytest.fixture
def mvp_user(db) -> CustomUser:
    """MVP 통합 테스트용 사용자."""
    return CustomUser.objects.create_user(
        username="mvp_user",
        email="mvp@example.com",
        password="secure_pass123!",
    )


@pytest.mark.django_db
def test_backend_mvp_e2e_scenario(mvp_user: CustomUser, api_client: APIClient) -> None:
    """Session 03~06 백엔드 MVP 전체 시나리오를 검증한다.

    순서:
    1. 온보딩 완료
    2. 목표 3개 생성 (financial, housing, learning)
    3. 일지 2개 작성
    4. 대시보드 점수 계산 확인
    5. 주간 리포트 수동 생성 및 조회
    """
    # ── Step 1: 온보딩 완료 ──────────────────────────────────────────
    complete_onboarding(
        user=mvp_user,
        data={"risk_tolerance": RiskTolerance.MODERATE},
    )
    mvp_user.refresh_from_db()
    assert mvp_user.onboarded_at is not None, "온보딩 완료 후 onboarded_at이 설정되어야 함"

    # ── Step 2: 목표 3개 생성 ────────────────────────────────────────
    financial_goal = create_goal(
        user=mvp_user,
        category=GoalCategory.FINANCIAL,
        title="비상금 3개월치 마련",
        description="매월 50만원 저축",
    )
    housing_goal = create_goal(
        user=mvp_user,
        category=GoalCategory.HOUSING,
        title="성동구 아파트 매수 시점 파악",
        description="실거래가 추이 분석",
    )
    learning_goal = create_goal(
        user=mvp_user,
        category=GoalCategory.LEARNING,
        title="Python 백엔드 역량 강화",
        description="Django REST Framework 완주",
    )
    assert financial_goal.pk is not None
    assert housing_goal.pk is not None
    assert learning_goal.pk is not None
    assert mvp_user.goals.filter(is_active=True).count() == 3, "활성 목표 3개가 생성되어야 함"

    # ── Step 3: 일지 2개 작성 ────────────────────────────────────────
    with patch("apps.journal.services._enqueue_summary_task"):
        journal1 = create_journal(
            user=mvp_user,
            category=JournalCategory.INVESTMENT,
            title="삼성전자 분할 매수 결정",
            content="52주 신저가 근접, PBR 1.0 이하. 분할 매수 1차 진입.",
            related_goal_id=financial_goal.pk,
        )
        journal2 = create_journal(
            user=mvp_user,
            category=JournalCategory.LEARNING,
            title="Django ORM 최적화 학습",
            content="select_related, prefetch_related 적용으로 N+1 쿼리 제거.",
            related_goal_id=learning_goal.pk,
        )
    assert journal1.pk is not None
    assert journal2.pk is not None
    assert mvp_user.journal_entries.count() == 2, "일지 2개가 생성되어야 함"

    # ── Step 4: 대시보드 점수 계산 ───────────────────────────────────
    api_client.force_authenticate(user=mvp_user)
    response = api_client.get("/api/v1/dashboard/")
    assert response.status_code == 200, f"대시보드 API 응답 오류: {response.data}"
    assert response.data["status"] == "success"
    score_data = response.data["data"]
    assert "capital_score" in score_data, "대시보드 응답에 capital_score 포함되어야 함"
    assert 0 <= score_data["capital_score"] <= 100

    snapshot = get_latest_snapshot(user_id=mvp_user.pk)
    assert snapshot is not None, "대시보드 조회 후 일별 스냅샷이 저장되어야 함"

    # ── Step 5: 주간 리포트 수동 생성 및 조회 ────────────────────────
    week_start = date(2025, 1, 6)

    response = api_client.post(
        "/api/v1/reports/weekly/generate/",
        data={"week_start": str(week_start)},
        format="json",
    )
    assert response.status_code == 201, f"리포트 생성 실패: {response.data}"
    assert response.data["status"] == "success"
    report_data = response.data["data"]
    assert report_data["journal_count"] == 0  # 해당 주(2025-01-06~12)에 일지 없음
    assert "highlights" in report_data
    assert "next_week_action" in report_data

    latest = get_latest_report(user=mvp_user)
    assert latest.week_start == week_start, "최신 리포트의 week_start가 일치해야 함"

    # 목록 API로도 조회 가능한지 확인
    response = api_client.get("/api/v1/reports/weekly/")
    assert response.status_code == 200
    assert len(response.data["data"]) == 1
