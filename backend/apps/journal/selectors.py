# backend/apps/journal/selectors.py
"""의사결정 일지 읽기 전용 쿼리."""

from __future__ import annotations

from django.db.models import QuerySet
from django.utils import timezone

from apps.journal.models import JournalEntry


def get_user_journals(
    *,
    user_id: int,
    category: str | None = None,
) -> QuerySet[JournalEntry]:
    """사용자의 일지 목록을 반환한다.

    Args:
        user_id: 조회 대상 사용자 PK.
        category: 필터링할 카테고리 (None이면 전체).

    Returns:
        JournalEntry QuerySet (최신순 정렬).
    """
    qs = JournalEntry.objects.filter(user_id=user_id).select_related("related_goal")
    if category:
        qs = qs.filter(category=category)
    return qs


def get_journal_by_id(*, journal_id: int) -> JournalEntry | None:
    """ID로 일지를 조회한다.

    Args:
        journal_id: 일지 PK.

    Returns:
        JournalEntry 또는 None.
    """
    return JournalEntry.objects.filter(pk=journal_id).select_related("related_goal").first()


def get_unreviewed_journals(*, user_id: int) -> QuerySet[JournalEntry]:
    """복기되지 않은 일지 목록을 반환한다.

    Args:
        user_id: 사용자 PK.

    Returns:
        미복기 JournalEntry QuerySet.
    """
    return JournalEntry.objects.filter(user_id=user_id, reviewed_at__isnull=True)


def get_recent_journal_count(*, user_id: int, days: int = 7) -> int:
    """최근 N일 이내 작성된 일지 수를 반환한다.

    Args:
        user_id: 사용자 PK.
        days: 조회 기간 (기본 7일).

    Returns:
        일지 작성 수.
    """
    cutoff = timezone.now() - timezone.timedelta(days=days)
    return JournalEntry.objects.filter(user_id=user_id, created_at__gte=cutoff).count()
