# backend/apps/reports/admin.py
"""주간 복기 리포트 Admin 등록."""

from __future__ import annotations

from django.contrib import admin

from apps.reports.models import WeeklyReport


@admin.register(WeeklyReport)
class WeeklyReportAdmin(admin.ModelAdmin):
    """주간 복기 리포트 Admin."""

    list_display = [
        "id",
        "user",
        "week_start",
        "week_end",
        "capital_score",
        "goal_achievement_rate",
        "journal_count",
        "created_at",
    ]
    list_filter = ["week_start"]
    search_fields = ["user__username"]
    readonly_fields = [
        "capital_score",
        "goal_achievement_rate",
        "journal_count",
        "action_completion_rate",
        "highlights",
        "improvements",
        "next_week_action",
        "ai_summary",
        "created_at",
    ]
    ordering = ["-week_start"]
