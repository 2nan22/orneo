# backend/apps/goals/exceptions.py
"""목표 도메인 예외."""

from __future__ import annotations


class GoalNotFoundError(Exception):
    """요청한 목표가 존재하지 않음."""


class GoalPermissionError(Exception):
    """다른 사용자의 목표 접근 시도."""
