# backend/apps/reports/exceptions.py
"""주간 복기 리포트 도메인 예외."""

from __future__ import annotations


class ReportAlreadyExistsError(Exception):
    """해당 주차 리포트가 이미 존재함."""


class ReportNotFoundError(Exception):
    """요청한 리포트가 존재하지 않음."""
