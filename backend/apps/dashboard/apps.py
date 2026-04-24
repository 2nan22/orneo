# backend/apps/dashboard/apps.py
"""라이프 캐피털 대시보드 앱 설정."""

from __future__ import annotations

from django.apps import AppConfig


class DashboardConfig(AppConfig):
    """Dashboard 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.dashboard"
    verbose_name = "라이프 캐피털 대시보드"
