# backend/apps/journal/admin.py
"""의사결정 일지 Admin 등록."""

from __future__ import annotations

from django.contrib import admin

from apps.journal.models import DecisionScenario, JournalEntry


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    """일지 Admin."""

    list_display = ["id", "user", "category", "title", "reviewed_at", "created_at"]
    list_filter = ["category"]
    search_fields = ["title", "user__email"]
    readonly_fields = ["ai_summary", "action_items", "created_at", "updated_at"]
    ordering = ["-created_at"]


@admin.register(DecisionScenario)
class DecisionScenarioAdmin(admin.ModelAdmin):
    """의사결정 시나리오 Admin."""

    list_display = ["id", "journal_entry", "topic", "model_used", "generated_at"]
    search_fields = ["topic", "journal_entry__title"]
    readonly_fields = ["evidence_chips", "scenarios", "model_used", "generated_at"]
