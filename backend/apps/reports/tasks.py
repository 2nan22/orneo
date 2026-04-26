# backend/apps/reports/tasks.py
"""주간 복기 리포트 Celery 태스크."""

from __future__ import annotations

import logging
from datetime import date, timedelta

from celery import shared_task

logger = logging.getLogger(__name__)


def _get_last_monday() -> date:
    """직전 월요일(또는 오늘이 월요일이면 오늘)을 반환한다."""
    today = date.today()
    days_since_monday = today.weekday()
    return today - timedelta(days=days_since_monday)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_weekly_reports_for_all_users(self) -> None:
    """매주 월요일 09:00 전체 활성 사용자의 주간 리포트를 생성한다.

    온보딩이 완료된 사용자(onboarded_at이 있는)를 대상으로 직전 주
    리포트를 생성한다. 이미 존재하는 리포트는 건너뛴다.
    """
    from apps.accounts.models import CustomUser
    from apps.reports.exceptions import ReportAlreadyExistsError
    from apps.reports.services import generate_weekly_report

    week_start = _get_last_monday()
    active_users = CustomUser.objects.filter(onboarded_at__isnull=False)
    total = active_users.count()

    logger.info(
        "[TASK:%s] 주간 리포트 일괄 생성 시작: week_start=%s total_users=%d",
        self.request.id,
        week_start,
        total,
    )

    created = 0
    skipped = 0
    failed = 0

    for user in active_users.iterator():
        try:
            generate_weekly_report(user=user, week_start=week_start)
            created += 1
        except ReportAlreadyExistsError:
            skipped += 1
        except Exception as exc:
            logger.warning(
                "[TASK:%s] 리포트 생성 실패: user_id=%d error=%s",
                self.request.id,
                user.pk,
                exc,
            )
            failed += 1

    logger.info(
        "[TASK:%s] 주간 리포트 일괄 생성 완료: week_start=%s created=%d skipped=%d failed=%d",
        self.request.id,
        week_start,
        created,
        skipped,
        failed,
    )
