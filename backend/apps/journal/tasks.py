# backend/apps/journal/tasks.py
"""의사결정 일지 Celery 태스크."""

from __future__ import annotations

import logging
import time

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def generate_journal_summary(self, journal_id: int) -> None:
    """일지 AI 요약을 비동기 생성한다.

    FastAPI /coach/summarize 엔드포인트를 호출하여 요약과 행동 제안을 받고
    JournalEntry에 저장한다. 실패 시 최대 3회 재시도(지수 백오프).

    Args:
        journal_id: 요약을 생성할 JournalEntry PK.
    """
    import httpx
    from django.conf import settings

    from apps.journal.models import JournalEntry

    logger.info("[TASK:%s] 시작: journal_id=%d", self.request.id, journal_id)
    start = time.monotonic()

    try:
        entry = JournalEntry.objects.get(pk=journal_id)
    except JournalEntry.DoesNotExist:
        logger.error("[TASK:%s] 일지를 찾을 수 없음: journal_id=%d", self.request.id, journal_id)
        return

    ai_service_url = getattr(settings, "AI_SERVICE_URL", "http://ai_service:8001")
    ai_service_secret = getattr(settings, "AI_SERVICE_SECRET", "")

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{ai_service_url}/coach/summarize",
                json={
                    "journal_text": entry.content,
                    "context": {
                        "category": entry.category,
                        "title": entry.title,
                    },
                },
                headers={"X-Service-Secret": ai_service_secret},
            )
            response.raise_for_status()
            data = response.json()

        entry.ai_summary = data.get("summary", "")
        entry.action_items = data.get("actions", [])
        entry.save(update_fields=["ai_summary", "action_items", "updated_at"])

        elapsed = time.monotonic() - start
        logger.info(
            "[TASK:%s] 완료: journal_id=%d elapsed=%.2fs",
            self.request.id, journal_id, elapsed,
        )

    except httpx.HTTPStatusError as exc:
        logger.warning(
            "[TASK:%s] AI 서비스 HTTP 오류 (시도 %d/%d): status=%d",
            self.request.id, self.request.retries + 1, self.max_retries, exc.response.status_code,
        )
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries)) from exc

    except httpx.RequestError as exc:
        logger.warning(
            "[TASK:%s] AI 서비스 연결 실패 (시도 %d/%d): %s",
            self.request.id, self.request.retries + 1, self.max_retries, exc,
        )
        raise self.retry(exc=exc, countdown=5 * (2 ** self.request.retries)) from exc


@shared_task(bind=True, max_retries=2, default_retry_delay=15)
def generate_decision_scenarios(self, journal_id: int) -> None:
    """의사결정 일지에 대한 A/B/C 시나리오를 비동기 생성한다.

    investment 또는 housing 카테고리 일지에만 실행한다.
    이미 시나리오가 있는 경우 스킵한다.

    Args:
        journal_id: 시나리오를 생성할 JournalEntry PK.
    """
    import httpx
    from django.conf import settings

    from apps.journal.models import DecisionScenario, JournalCategory, JournalEntry

    logger.info("[TASK:%s] decision-scenarios 시작: journal_id=%d", self.request.id, journal_id)

    try:
        entry = JournalEntry.objects.get(pk=journal_id)
    except JournalEntry.DoesNotExist:
        logger.error("[TASK:%s] 일지를 찾을 수 없음: journal_id=%d", self.request.id, journal_id)
        return

    if entry.category not in (JournalCategory.INVESTMENT, JournalCategory.HOUSING):
        logger.info(
            "[TASK:%s] 시나리오 생략: category=%s journal_id=%d",
            self.request.id, entry.category, journal_id,
        )
        return

    if DecisionScenario.objects.filter(journal_entry=entry).exists():
        logger.info("[TASK:%s] 시나리오 이미 존재: journal_id=%d", self.request.id, journal_id)
        return

    ai_service_url = getattr(settings, "AI_SERVICE_URL", "http://ai_service:8001")
    ai_service_secret = getattr(settings, "AI_SERVICE_SECRET", "")

    user_goals = list(
        entry.user.goals.filter(is_active=True)
        .filter(category=entry.category)
        .values_list("title", flat=True)[:3]
    )

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{ai_service_url}/decision/scenarios",
                json={
                    "topic": entry.title,
                    "context": {
                        "category": entry.category,
                        "user_goals": user_goals,
                        "recent_data": [],
                    },
                },
                headers={"X-Service-Secret": ai_service_secret},
            )
            response.raise_for_status()
            data = response.json()

        DecisionScenario.objects.create(
            journal_entry=entry,
            topic=data.get("topic", entry.title),
            evidence_chips=data.get("evidence_chips", []),
            scenarios=data.get("scenarios", []),
            model_used=data.get("model_used", "unknown"),
        )
        logger.info(
            "[TASK:%s] decision-scenarios 완료: journal_id=%d",
            self.request.id, journal_id,
        )

    except httpx.HTTPStatusError as exc:
        logger.warning(
            "[TASK:%s] HTTP 오류 (시도 %d/%d): status=%d",
            self.request.id, self.request.retries + 1, self.max_retries, exc.response.status_code,
        )
        raise self.retry(exc=exc, countdown=15 * (2 ** self.request.retries)) from exc
    except httpx.RequestError as exc:
        logger.warning(
            "[TASK:%s] 연결 실패 (시도 %d/%d): %s",
            self.request.id, self.request.retries + 1, self.max_retries, exc,
        )
        raise self.retry(exc=exc, countdown=15 * (2 ** self.request.retries)) from exc
