# backend/apps/accounts/admin.py
"""사용자 Admin 등록."""

from __future__ import annotations

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.accounts.models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """CustomUser 관리자 화면."""

    list_display = ["id", "username", "email", "subscription_plan", "onboarded_at", "created_at"]
    list_filter = ["subscription_plan", "risk_tolerance", "primary_provider"]
    search_fields = ["username", "email"]
    readonly_fields = ["created_at", "updated_at", "onboarded_at"]
    ordering = ["-created_at"]

    fieldsets = UserAdmin.fieldsets + (
        (
            "ORNEO 설정",
            {
                "fields": (
                    "subscription_plan",
                    "risk_tolerance",
                    "onboarded_at",
                    "primary_provider",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
