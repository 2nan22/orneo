# backend/apps/dashboard/admin.py
"""라이프 캐피털 대시보드 Admin 등록."""

from __future__ import annotations

from django.contrib import admin

from apps.dashboard.models import CapitalScoreSnapshot


@admin.register(CapitalScoreSnapshot)
class CapitalScoreSnapshotAdmin(admin.ModelAdmin):
    """캐피털 점수 스냅샷 Admin."""

    list_display = ["id", "user", "score_date", "capital_score", "asset_stability", "goal_progress", "routine_score"]
    list_filter = ["score_date"]
    search_fields = ["user__email"]
    readonly_fields = ["capital_score", "asset_stability", "goal_progress", "routine_score", "created_at"]
    ordering = ["-score_date"]
