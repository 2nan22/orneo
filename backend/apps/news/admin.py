# backend/apps/news/admin.py
"""뉴스 도메인 Admin 등록."""

from __future__ import annotations

from django.contrib import admin

from apps.news.models import (
    MarketCompany,
    MarketSector,
    NewsAnalysis,
    NewsSectorAnalysis,
)


@admin.register(MarketSector)
class MarketSectorAdmin(admin.ModelAdmin):
    """섹터 마스터 Admin."""

    list_display = ["id", "sector_code", "sector_name_ko", "market", "display_order", "is_active"]
    list_filter = ["market", "is_active"]
    search_fields = ["sector_code", "sector_name_ko", "sector_name_en"]
    ordering = ["display_order"]


@admin.register(MarketCompany)
class MarketCompanyAdmin(admin.ModelAdmin):
    """종목 마스터 Admin."""

    list_display = ["id", "ticker", "company_name_ko", "company_name_en", "market", "exchange", "sector", "is_active"]
    list_filter = ["market", "exchange", "is_active", "sector"]
    search_fields = ["ticker", "company_name_ko", "company_name_en"]


@admin.register(NewsAnalysis)
class NewsAnalysisAdmin(admin.ModelAdmin):
    """뉴스 분석 헤더 Admin."""

    list_display = ["id", "analysis_date", "market", "engine_type", "run_status", "run_duration_ms"]
    list_filter = ["market", "engine_type", "run_status"]
    readonly_fields = ["raw_result", "run_duration_ms", "created_at", "updated_at"]
    ordering = ["-analysis_date"]


@admin.register(NewsSectorAnalysis)
class NewsSectorAnalysisAdmin(admin.ModelAdmin):
    """섹터별 뉴스 분석 Admin (시그널/종목 디버깅용)."""

    list_display = [
        "id",
        "analysis",
        "sector",
        "article_count",
        "investment_signal",
        "investment_signal_raw",
        "recommended_stocks",
    ]
    list_filter = ["sector__market", "investment_signal"]
    search_fields = ["sector__sector_name_ko"]
    readonly_fields = ["created_at", "updated_at"]
