# backend/apps/accounts/apps.py
"""Accounts 앱 설정."""

from __future__ import annotations

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """사용자 인증 및 프로필 앱."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "사용자 인증"
