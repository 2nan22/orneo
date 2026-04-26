# backend/apps/goals/admin.py
"""목표 Admin 등록."""

from __future__ import annotations

from django.contrib import admin

from apps.goals.models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    """Goal 관리자 화면."""

    list_display = ["id", "user", "category", "title", "progress", "is_active", "created_at"]
    list_filter = ["category", "is_active"]
    search_fields = ["title", "user__email"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
