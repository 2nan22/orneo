# backend/apps/public_data/apps.py
"""공공 데이터 앱 설정."""

from __future__ import annotations

from django.apps import AppConfig


class PublicDataConfig(AppConfig):
    """공공 데이터 앱 설정 클래스."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.public_data"
    verbose_name = "공공 데이터"
