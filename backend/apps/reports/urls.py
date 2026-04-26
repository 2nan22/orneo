# backend/apps/reports/urls.py
"""주간 복기 리포트 URL 라우팅."""

from __future__ import annotations

from django.urls import path

from apps.reports.views import (
    WeeklyReportGenerateView,
    WeeklyReportLatestView,
    WeeklyReportListView,
)

urlpatterns = [
    path("weekly/", WeeklyReportListView.as_view(), name="weekly-report-list"),
    path("weekly/latest/", WeeklyReportLatestView.as_view(), name="weekly-report-latest"),
    path("weekly/generate/", WeeklyReportGenerateView.as_view(), name="weekly-report-generate"),
]
