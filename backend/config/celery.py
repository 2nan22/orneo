# backend/config/celery.py
"""Celery 애플리케이션 설정."""

from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

app = Celery("orneo")

# Django settings에서 CELERY_ 접두사 설정을 자동 로드
app.config_from_object("django.conf:settings", namespace="CELERY")

# 등록된 Django 앱에서 tasks.py 자동 검색
app.autodiscover_tasks()
