# backend/config/settings/dev.py
"""개발 환경 설정."""

from __future__ import annotations

from .base import *  # noqa: F401, F403

DEBUG = True

INSTALLED_APPS += ["django_extensions"]  # noqa: F405

LOGGING["root"]["level"] = "DEBUG"  # noqa: F405
