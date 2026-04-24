# backend/apps/reports/serializers.py
"""주간 복기 리포트 직렬화."""

from __future__ import annotations

from rest_framework import serializers

from apps.reports.models import WeeklyReport


class WeeklyReportResponseSerializer(serializers.ModelSerializer):
    """주간 리포트 응답 직렬화."""

    class Meta:
        model = WeeklyReport
        fields = [
            "id",
            "week_start",
            "week_end",
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
        read_only_fields = fields


class WeeklyReportGenerateSerializer(serializers.Serializer):
    """수동 리포트 생성 요청 직렬화."""

    week_start = serializers.DateField(
        help_text="리포트 생성 기준 주 시작일 (YYYY-MM-DD, 월요일).",
    )

    def validate_week_start(self, value):
        """week_start가 월요일인지 검증한다."""
        if value.weekday() != 0:
            raise serializers.ValidationError("week_start는 월요일(weekday=0)이어야 합니다.")
        return value
