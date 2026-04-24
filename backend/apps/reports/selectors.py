# backend/apps/reports/selectors.py
"""주간 복기 리포트 읽기 전용 쿼리."""

from __future__ import annotations

from django.db.models import QuerySet

from apps.accounts.models import CustomUser
from apps.reports.exceptions import ReportNotFoundError
from apps.reports.models import WeeklyReport


def get_report_history(*, user: CustomUser) -> QuerySet[WeeklyReport]:
    """사용자의 주간 리포트 목록을 최신순으로 반환한다.

    Args:
        user: 조회 대상 사용자.

    Returns:
        WeeklyReport QuerySet (최신 week_start 기준 내림차순).
    """
    return WeeklyReport.objects.filter(user=user)


def get_latest_report(*, user: CustomUser) -> WeeklyReport:
    """사용자의 가장 최근 주간 리포트를 반환한다.

    Args:
        user: 조회 대상 사용자.

    Returns:
        최신 WeeklyReport 인스턴스.

    Raises:
        ReportNotFoundError: 리포트가 존재하지 않는 경우.
    """
    report = WeeklyReport.objects.filter(user=user).first()
    if report is None:
        raise ReportNotFoundError("아직 생성된 주간 리포트가 없습니다.")
    return report
