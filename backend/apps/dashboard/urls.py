# backend/apps/dashboard/urls.py
"""라이프 캐피털 대시보드 URL 라우팅."""

from __future__ import annotations

from django.urls import path

from apps.dashboard.views import DashboardView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
]
