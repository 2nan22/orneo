# backend/apps/journal/exceptions.py
"""의사결정 일지 도메인 예외."""

from __future__ import annotations


class JournalNotFoundError(Exception):
    """요청한 일지가 존재하지 않음."""


class JournalPermissionError(Exception):
    """다른 사용자의 일지 접근 시도."""


class JournalAlreadyReviewedError(Exception):
    """이미 복기된 일지에 재복기 시도."""
