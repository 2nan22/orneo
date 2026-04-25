# backend/apps/dashboard/admin.py
"""라이프 캐피털 대시보드 Admin 등록."""

from __future__ import annotations

from django.contrib import admin

from apps.dashboard.models import CapitalScoreSnapshot, DailyKeyQuestion, TodayAction


@admin.register(CapitalScoreSnapshot)
class CapitalScoreSnapshotAdmin(admin.ModelAdmin):
    """캐피털 점수 스냅샷 Admin."""

    list_display = ["id", "user", "score_date", "capital_score", "asset_stability", "goal_progress", "routine_score"]
    list_filter = ["score_date"]
    search_fields = ["user__email"]
    readonly_fields = ["capital_score", "asset_stability", "goal_progress", "routine_score", "created_at"]
    ordering = ["-score_date"]


@admin.register(TodayAction)
class TodayActionAdmin(admin.ModelAdmin):
    """오늘의 행동 Admin."""

    list_display = ["id", "user", "text", "category", "completed", "action_date"]
    list_filter = ["action_date", "category", "completed"]
    search_fields = ["user__email", "text"]


@admin.register(DailyKeyQuestion)
class DailyKeyQuestionAdmin(admin.ModelAdmin):
    """오늘의 핵심 질문 Admin."""

    list_display = ["id", "user", "question_date", "question"]
    list_filter = ["question_date"]
    search_fields = ["user__email"]
