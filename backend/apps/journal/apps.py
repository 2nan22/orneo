# backend/apps/journal/apps.py
"""의사결정 일지 앱 설정."""

from __future__ import annotations

from django.apps import AppConfig


class JournalConfig(AppConfig):
    """Journal 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.journal"
    verbose_name = "의사결정 일지"
