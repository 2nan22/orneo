# backend/apps/journal/tests/test_services.py
"""의사결정 일지 서비스 테스트."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from apps.accounts.models import CustomUser
from apps.journal.exceptions import (
    JournalAlreadyReviewedError,
    JournalNotFoundError,
    JournalPermissionError,
)
from apps.journal.models import JournalCategory, JournalEntry
from apps.journal.services import create_journal, mark_reviewed


@pytest.mark.django_db
def test_create_journal_success(user: CustomUser) -> None:
    """일지 생성이 정상적으로 동작한다."""
    with patch("apps.journal.services._enqueue_summary_task"):
        entry = create_journal(
            user=user,
            category=JournalCategory.INVESTMENT,
            title="삼성전자 매수 고려",
            content="실거래가 하락세 반전 확인",
        )

    assert isinstance(entry, JournalEntry)
    assert entry.user == user
    assert entry.category == JournalCategory.INVESTMENT
    assert entry.ai_summary == ""


@pytest.mark.django_db(transaction=True)
def test_create_journal_triggers_summary_task(user: CustomUser) -> None:
    """일지 생성 시 AI 요약 태스크가 커밋 후 등록된다."""
    with patch("apps.journal.services._enqueue_summary_task") as mock_enqueue:
        entry = create_journal(
            user=user,
            category=JournalCategory.LEARNING,
            title="파이썬 스터디",
            content="오늘 배운 내용 정리",
        )
    mock_enqueue.assert_called_once_with(entry.pk)


@pytest.mark.django_db
def test_mark_reviewed_success(user: CustomUser, journal_entry: JournalEntry) -> None:
    """복기 메모 작성이 정상적으로 동작한다."""
    reviewed = mark_reviewed(
        journal_id=journal_entry.pk,
        user=user,
        review_note="예상대로 흘러갔다. 다음엔 더 빠르게 결정.",
    )

    assert reviewed.review_note == "예상대로 흘러갔다. 다음엔 더 빠르게 결정."
    assert reviewed.reviewed_at is not None


@pytest.mark.django_db
def test_mark_reviewed_not_found(user: CustomUser) -> None:
    """존재하지 않는 일지 복기 시 JournalNotFoundError가 발생한다."""
    with pytest.raises(JournalNotFoundError):
        mark_reviewed(journal_id=9999, user=user, review_note="메모")


@pytest.mark.django_db
def test_mark_reviewed_permission_denied(
    other_user: CustomUser, journal_entry: JournalEntry
) -> None:
    """다른 사용자의 일지 복기 시 JournalPermissionError가 발생한다."""
    with pytest.raises(JournalPermissionError):
        mark_reviewed(
            journal_id=journal_entry.pk,
            user=other_user,
            review_note="메모",
        )


@pytest.mark.django_db
def test_mark_reviewed_already_reviewed(user: CustomUser, journal_entry: JournalEntry) -> None:
    """이미 복기된 일지 재복기 시 JournalAlreadyReviewedError가 발생한다."""
    mark_reviewed(journal_id=journal_entry.pk, user=user, review_note="첫 번째 복기")
    with pytest.raises(JournalAlreadyReviewedError):
        mark_reviewed(journal_id=journal_entry.pk, user=user, review_note="두 번째 복기")
