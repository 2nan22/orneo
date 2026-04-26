# backend/apps/public_data/urls.py
"""공공 데이터 URL 라우팅."""

from __future__ import annotations

from django.urls import path

from apps.public_data.views import KmoocCourseSearchView

urlpatterns = [
    path("kmooc/courses/", KmoocCourseSearchView.as_view(), name="kmooc-course-search"),
]
