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
