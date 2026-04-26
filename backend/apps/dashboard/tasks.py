# backend/apps/dashboard/tasks.py
"""대시보드 Celery 태스크."""

from __future__ import annotations

import logging
import time

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def generate_daily_actions_for_user(self, user_id: int) -> None:
    """단일 사용자의 일일 행동과 핵심 질문을 Gemma4로 생성하고 저장한다.

    Args:
        user_id: 처리할 CustomUser PK.
    """
    import httpx
    from django.conf import settings
    from django.utils import timezone

    from apps.accounts.models import CustomUser
    from apps.dashboard.models import DailyKeyQuestion, TodayAction
    from apps.goals.models import Goal
    from apps.journal.models import JournalEntry

    logger.info("[TASK:%s] daily-actions 시작: user_id=%d", self.request.id, user_id)
    start = time.monotonic()

    try:
        user = CustomUser.objects.get(pk=user_id)
    except CustomUser.DoesNotExist:
        logger.error("사용자 없음: user_id=%d", user_id)
        return

    today = timezone.localdate()
    ai_service_url = getattr(settings, "AI_SERVICE_URL", "http://ai_service:8001")
    ai_service_secret = getattr(settings, "AI_SERVICE_SECRET", "")

    goals = list(
        Goal.objects.filter(user=user, is_active=True)
        .values("category", "title", "progress")[:10]
    )

    recent_summaries = list(
        JournalEntry.objects.filter(user=user)
        .exclude(ai_summary="")
        .order_by("-created_at")
        .values_list("ai_summary", flat=True)[:3]
    )

    preferred_model = getattr(user, "preferred_ai_model", "auto")

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{ai_service_url}/coach/daily-actions",
                json={
                    "goals": goals,
                    "recent_journal_summaries": recent_summaries,
                    "risk_tolerance": user.risk_tolerance,
                    "preferred_model": preferred_model,
                },
                headers={"X-Service-Secret": ai_service_secret},
            )
            response.raise_for_status()
            data = response.json()

        TodayAction.objects.filter(user=user, action_date=today).delete()
        TodayAction.objects.bulk_create([
            TodayAction(
                user=user,
                text=action["text"],
                category=action.get("category", "general"),
                action_date=today,
            )
            for action in data.get("actions", [])[:3]
        ])

        DailyKeyQuestion.objects.update_or_create(
            user=user,
            question_date=today,
            defaults={"question": data.get("key_question", "")},
        )

        elapsed = time.monotonic() - start
        logger.info(
            "[TASK:%s] daily-actions 완료: user_id=%d elapsed=%.2fs model=%s",
            self.request.id,
            user_id,
            elapsed,
            data.get("model_used"),
        )

    except httpx.HTTPStatusError as exc:
        logger.warning(
            "[TASK:%s] AI 서비스 HTTP 오류 (시도 %d/%d): status=%d",
            self.request.id,
            self.request.retries + 1,
            self.max_retries,
            exc.response.status_code,
        )
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries)) from exc

    except httpx.RequestError as exc:
        logger.warning(
            "[TASK:%s] AI 서비스 연결 실패 (시도 %d/%d): %s",
            self.request.id,
            self.request.retries + 1,
            self.max_retries,
            exc,
        )
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries)) from exc


@shared_task
def generate_daily_actions_for_all_users() -> None:
    """모든 온보딩 완료 사용자의 일일 행동을 생성하는 dispatcher 태스크.

    매일 오전 6시 Celery Beat에 의해 실행된다.
    """
    from apps.accounts.models import CustomUser

    user_ids = list(
        CustomUser.objects.filter(onboarded_at__isnull=False)
        .values_list("id", flat=True)
    )
    logger.info("일일 행동 생성 dispatcher: %d명 처리 예정", len(user_ids))
    for uid in user_ids:
        generate_daily_actions_for_user.delay(uid)
