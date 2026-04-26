# backend/apps/journal/tasks.py
"""의사결정 일지 Celery 태스크."""

from __future__ import annotations

import logging
import time

import httpx
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)

_FALLBACK_EVIDENCE_CHIPS = ["목표 진척도", "리스크 수준", "실행 가능성"]
_FALLBACK_SCENARIOS = [
    {"id": "A", "title": "현재 상태 유지", "risk": "낮음",  "description": "현재 상황을 유지하며 추가 데이터를 수집합니다."},
    {"id": "B", "title": "단계적 실행",    "risk": "중간",  "description": "작은 단계부터 시작해 리스크를 분산합니다."},
    {"id": "C", "title": "적극적 전환",    "risk": "높음",  "description": "목표 달성을 위해 빠르게 행동합니다."},
]


def _save_fallback_scenarios(entry, task_id: str) -> None:
    """AI 서비스 불가 시 기본 시나리오를 DB에 저장한다."""
    from apps.journal.models import DecisionScenario

    DecisionScenario.objects.get_or_create(
        journal_entry=entry,
        defaults={
            "topic": entry.title,
            "evidence_chips": _FALLBACK_EVIDENCE_CHIPS,
            "scenarios": _FALLBACK_SCENARIOS,
            "model_used": "fallback",
        },
    )
    logger.error("[TASK:%s] 최종 실패, fallback 시나리오 저장: journal_id=%d", task_id, entry.pk)


def build_scenarios_sync(*, entry) -> dict:
    """AI 서비스에 동기 요청하여 시나리오를 생성한다.

    AI 서비스 연결 실패 시 fallback 데이터를 반환한다.

    Args:
        entry: JournalEntry 인스턴스.

    Returns:
        topic, evidence_chips, scenarios, model_used 딕셔너리.
    """
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
            return response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        logger.warning("AI 서비스 호출 실패, fallback 반환: %s", exc)
        return {
            "topic": entry.title,
            "evidence_chips": _FALLBACK_EVIDENCE_CHIPS,
            "scenarios": _FALLBACK_SCENARIOS,
            "model_used": "fallback",
        }


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
    이미 시나리오가 있는 경우 스킵한다. AI 서비스 연결 실패 시 fallback 저장.

    Args:
        journal_id: 시나리오를 생성할 JournalEntry PK.
    """
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

    try:
        data = build_scenarios_sync(entry=entry)
        DecisionScenario.objects.create(
            journal_entry=entry,
            topic=data.get("topic", entry.title),
            evidence_chips=data.get("evidence_chips", []),
            scenarios=data.get("scenarios", []),
            model_used=data.get("model_used", "unknown"),
        )
        logger.info("[TASK:%s] decision-scenarios 완료: journal_id=%d", self.request.id, journal_id)

    except Exception as exc:
        logger.warning(
            "[TASK:%s] 오류 (시도 %d/%d): %s",
            self.request.id, self.request.retries + 1, self.max_retries, exc,
        )
        try:
            raise self.retry(exc=exc, countdown=15 * (2 ** self.request.retries)) from exc
        except Exception:
            _save_fallback_scenarios(entry, self.request.id)
