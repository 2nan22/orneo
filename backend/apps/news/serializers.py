from rest_framework import serializers

from apps.news.models import MarketSector, NewsAnalysis, NewsSectorAnalysis


class MarketSectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketSector
        fields = ["id", "sector_code", "sector_name_ko", "sector_name_en", "market", "display_order"]


class NewsSectorAnalysisSerializer(serializers.ModelSerializer):
    sector_name_ko = serializers.CharField(source="sector.sector_name_ko", read_only=True)

    class Meta:
        model = NewsSectorAnalysis
        fields = ["id", "sector_name_ko", "analysis_text", "article_count"]


class NewsAnalysisSerializer(serializers.ModelSerializer):
    sector_analyses = NewsSectorAnalysisSerializer(many=True, read_only=True)

    class Meta:
        model = NewsAnalysis
        fields = [
            "id", "analysis_date", "market", "engine_type", "run_status",
            "overall_analysis", "run_duration_ms", "sector_analyses", "created_at",
        ]
