# backend/apps/reports/apps.py
"""주간 복기 리포트 앱 설정."""

from __future__ import annotations

from django.apps import AppConfig


class ReportsConfig(AppConfig):
    """Reports 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.reports"
    verbose_name = "주간 복기 리포트"
