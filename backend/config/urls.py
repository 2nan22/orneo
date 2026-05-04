# backend/config/urls.py
"""ORNEO URL 라우팅."""

from __future__ import annotations

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

urlpatterns = [
    path("health/", lambda request: JsonResponse({"status": "ok"})),
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/auth/", include("dj_rest_auth.urls")),
    path("api/v1/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/v1/goals/", include("apps.goals.urls")),
    path("api/v1/journals/", include("apps.journal.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/public-data/", include("apps.public_data.urls")),
    path("api/v1/news/", include("apps.news.urls")),
]
