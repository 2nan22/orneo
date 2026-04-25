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
) -> JournalEntry:
    """의사결정 일지를 생성하고 AI 요약 태스크를 큐에 등록한다.

    Args:
        user: 작성자.
        category: 일지 카테고리.
        title: 제목.
        content: 판단의 이유·근거.
        mood_score: 감정 점수 (1~5, 선택).
        related_goal_id: 연관 목표 PK (선택).

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
    )
    transaction.on_commit(lambda: _enqueue_summary_task(entry.pk))
    logger.info("일지 생성 완료: id=%d user_id=%d category=%s", entry.pk, user.pk, category)
    return entry


def _enqueue_summary_task(journal_id: int) -> None:
    """AI 요약 Celery 태스크를 큐에 등록한다."""
    # tasks.py → services.py 순환 임포트 방지를 위해 지연 임포트
    from apps.journal.tasks import generate_journal_summary

    generate_journal_summary.delay(journal_id)


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
