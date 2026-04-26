# backend/apps/journal/tests/conftest.py
"""일지 테스트 공통 픽스처."""

from __future__ import annotations

import pytest

from apps.accounts.models import CustomUser
from apps.journal.models import JournalCategory, JournalEntry


@pytest.fixture
def user(db) -> CustomUser:
    """테스트용 사용자 픽스처."""
    return CustomUser.objects.create_user(
        username="journal_user", email="journal@example.com", password="pass123!"
    )


@pytest.fixture
def other_user(db) -> CustomUser:
    """다른 사용자 픽스처."""
    return CustomUser.objects.create_user(
        username="other_user", email="other@example.com", password="pass123!"
    )


@pytest.fixture
def journal_entry(user: CustomUser) -> JournalEntry:
    """테스트용 일지 픽스처."""
    return JournalEntry.objects.create(
        user=user,
        category=JournalCategory.INVESTMENT,
        title="삼성전자 매수 고려",
        content="실거래가 하락세 반전 확인, 분할 매수 검토 중",
    )
