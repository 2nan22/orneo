# backend/apps/journal/services.py
"""의사결정 일지 비즈니스 로직."""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.journal.exceptions import (
    JournalAlreadyReviewedError,
    JournalNotFoundError,
    JournalPermissionError,
)
from apps.journal.models import JournalEntry
from apps.journal.selectors import get_journal_by_id

logger = logging.getLogger(__name__)


@transaction.atomic
def create_journal(
    *,
    user: CustomUser,
    category: str,
    title: str,
    content: str,
    mood_score: int | None = None,
    related_goal_id: int | None = None,
    dart_corp_code: str = "",
    dart_corp_name: str = "",
) -> JournalEntry:
    """의사결정 일지를 생성하고 AI 요약 태스크를 큐에 등록한다.

    Args:
        user: 작성자.
        category: 일지 카테고리.
        title: 제목.
        content: 판단의 이유·근거.
        mood_score: 감정 점수 (1~5, 선택).
        related_goal_id: 연관 목표 PK (선택).
        dart_corp_code: DART 기업 고유번호 (투자 카테고리 선택 시, 선택).
        dart_corp_name: DART 기업명 (투자 카테고리 선택 시, 선택).

    Returns:
        생성된 JournalEntry 인스턴스.
    """
    entry = JournalEntry.objects.create(
        user=user,
        category=category,
        title=title,
        content=content,
        mood_score=mood_score,
        related_goal_id=related_goal_id,
        dart_corp_code=dart_corp_code,
        dart_corp_name=dart_corp_name,
    )
    transaction.on_commit(lambda: _enqueue_summary_task(entry.pk))
    logger.info("일지 생성 완료: id=%d user_id=%d category=%s", entry.pk, user.pk, category)
    return entry


def _enqueue_summary_task(journal_id: int) -> None:
    """AI 요약 및 시나리오 생성 Celery 태스크를 큐에 등록한다."""
    # tasks.py → services.py 순환 임포트 방지를 위해 지연 임포트
    from apps.journal.tasks import generate_decision_scenarios, generate_journal_summary

    generate_journal_summary.delay(journal_id)
    generate_decision_scenarios.delay(journal_id)


def _get_journal_or_raise(journal_id: int) -> JournalEntry:
    """일지를 조회하거나 JournalNotFoundError를 발생시킨다.

    Args:
        journal_id: 일지 PK.

    Returns:
        조회된 JournalEntry 인스턴스.

    Raises:
        JournalNotFoundError: 일지가 존재하지 않는 경우.
    """
    entry = get_journal_by_id(journal_id=journal_id)
    if entry is None:
        raise JournalNotFoundError(f"일지를 찾을 수 없습니다: id={journal_id}")
    return entry


def generate_scenarios_for_entry(
    *, entry: JournalEntry, force: bool = False
) -> "DecisionScenario":
    """일지의 의사결정 시나리오를 즉시(동기) 생성하거나 기존 시나리오를 반환한다.

    Celery 없이 요청 즉시 AI 서비스를 호출한다.
    AI 서비스 불가 시 fallback 시나리오를 저장한다.

    Args:
        entry: 시나리오를 생성할 JournalEntry 인스턴스.
        force: True이면 기존 시나리오를 삭제하고 재생성한다.

    Returns:
        저장된 DecisionScenario 인스턴스.
    """
    from apps.journal.models import DecisionScenario
    from apps.journal.tasks import build_scenarios_sync

    if force:
        DecisionScenario.objects.filter(journal_entry=entry).delete()
    else:
        existing = DecisionScenario.objects.filter(journal_entry=entry).first()
        if existing:
            return existing

    data = build_scenarios_sync(entry=entry)
    scenario, _ = DecisionScenario.objects.get_or_create(
        journal_entry=entry,
        defaults={
            "topic":          data.get("topic", entry.title),
            "evidence_chips": data.get("evidence_chips", []),
            "scenarios":      data.get("scenarios", []),
            "model_used":     data.get("model_used", "unknown"),
        },
    )
    logger.info(
        "시나리오 온디맨드 생성 완료: journal_id=%d model=%s force=%s",
        entry.pk, scenario.model_used, force,
    )
    return scenario


def get_journal_for_user(*, journal_id: int, user: CustomUser) -> JournalEntry:
    """일지를 조회하고 요청 사용자의 소유 여부를 검증한다.

    Args:
        journal_id: 일지 PK.
        user: 요청 사용자.

    Returns:
        조회된 JournalEntry 인스턴스.

    Raises:
        JournalNotFoundError: 일지가 존재하지 않는 경우.
        JournalPermissionError: 다른 사용자의 일지에 접근하는 경우.
    """
    entry = _get_journal_or_raise(journal_id=journal_id)
    if entry.user_id != user.pk:
        raise JournalPermissionError("접근 권한이 없습니다.")
    return entry


@transaction.atomic
def mark_reviewed(
    *,
    journal_id: int,
    user: CustomUser,
    review_note: str,
) -> JournalEntry:
    """일지에 복기 메모를 작성한다.

    Args:
        journal_id: 일지 PK.
        user: 요청 사용자.
        review_note: 복기 메모 내용.

    Returns:
        업데이트된 JournalEntry 인스턴스.

    Raises:
        JournalNotFoundError: 일지가 존재하지 않는 경우.
        JournalPermissionError: 다른 사용자의 일지에 접근하는 경우.
        JournalAlreadyReviewedError: 이미 복기된 일지인 경우.
    """
    entry = _get_journal_or_raise(journal_id=journal_id)
    if entry.user_id != user.pk:
        raise JournalPermissionError("접근 권한이 없습니다.")
    if entry.reviewed_at is not None:
        raise JournalAlreadyReviewedError("이미 복기된 일지입니다.")

    entry.reviewed_at = timezone.now()
    entry.review_note = review_note
    entry.save(update_fields=["reviewed_at", "review_note", "updated_at"])

    logger.info("일지 복기 완료: id=%d user_id=%d", entry.pk, user.pk)
    return entry
