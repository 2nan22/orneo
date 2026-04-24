# backend/apps/accounts/exceptions.py
"""사용자 도메인 예외."""

from __future__ import annotations


class AccountNotFoundError(Exception):
    """요청한 사용자가 존재하지 않음."""


class OnboardingAlreadyDoneError(Exception):
    """이미 온보딩을 완료한 사용자의 재온보딩 시도."""
