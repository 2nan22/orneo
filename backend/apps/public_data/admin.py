# backend/apps/public_data/admin.py
"""공공 데이터 Admin 등록."""

from __future__ import annotations

from django.contrib import admin

from apps.public_data.models import KmoocCourse


@admin.register(KmoocCourse)
class KmoocCourseAdmin(admin.ModelAdmin):
    """K-MOOC 강좌 Admin."""

    list_display = ["course_id", "course_name", "org_name", "public_yn", "is_active", "synced_at"]
    list_filter = ["is_active", "public_yn"]
    search_fields = ["course_name", "org_name", "professor"]
    readonly_fields = ["course_id", "synced_at", "created_at"]
    ordering = ["-synced_at"]
