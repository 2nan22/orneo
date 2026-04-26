# backend/conftest.py
"""pytest 전역 설정."""

from __future__ import annotations

import pytest
from django.test import Client


@pytest.fixture
def api_client():
    """인증되지 않은 Django 테스트 클라이언트."""
    return Client()


@pytest.fixture
def user(db):
    """온보딩 완료된 테스트 사용자 픽스처."""
    from django.utils import timezone

    from apps.accounts.models import CustomUser

    return CustomUser.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
        onboarded_at=timezone.now(),
    )


@pytest.fixture
def auth_client(user):
    """로그인된 Django 테스트 클라이언트."""
    client = Client()
    client.force_login(user)
    return client
