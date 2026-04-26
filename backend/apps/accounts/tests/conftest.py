# backend/apps/accounts/tests/conftest.py
"""사용자 테스트 픽스처."""

from __future__ import annotations

import pytest

from apps.accounts.models import CustomUser


@pytest.fixture
def user_fixture(db) -> CustomUser:
    """테스트용 사용자 픽스처."""
    return CustomUser.objects.create_user(
        username="testuser",
        email="testuser@example.com",
        password="testpass123!",
    )


@pytest.fixture
def onboarded_user_fixture(db) -> CustomUser:
    """온보딩 완료된 테스트용 사용자 픽스처."""
    from django.utils import timezone

    user = CustomUser.objects.create_user(
        username="onboarded",
        email="onboarded@example.com",
        password="testpass123!",
    )
    user.onboarded_at = timezone.now()
    user.save(update_fields=["onboarded_at"])
    return user
