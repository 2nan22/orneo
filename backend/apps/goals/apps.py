# backend/apps/goals/apps.py
"""Goals 앱 설정."""

from __future__ import annotations

from django.apps import AppConfig


class GoalsConfig(AppConfig):
    """목표 설정 앱."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.goals"
    verbose_name = "목표 설정"
