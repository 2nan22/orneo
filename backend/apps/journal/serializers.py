# backend/apps/journal/serializers.py
"""의사결정 일지 시리얼라이저."""

from __future__ import annotations

from rest_framework import serializers

from apps.journal.models import DecisionScenario, JournalCategory, JournalEntry


class JournalCreateSerializer(serializers.Serializer):
    """일지 생성 입력 시리얼라이저."""

    category = serializers.ChoiceField(choices=[c.value for c in JournalCategory])
    title = serializers.CharField(max_length=200)
    content = serializers.CharField()
    mood_score = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    related_goal_id = serializers.IntegerField(required=False, allow_null=True)


class JournalReviewSerializer(serializers.Serializer):
    """복기 메모 작성 입력 시리얼라이저."""

    review_note = serializers.CharField()


class DecisionScenarioInlineSerializer(serializers.ModelSerializer):
    """시나리오 인라인 시리얼라이저."""

    disclaimer = serializers.SerializerMethodField()

    class Meta:
        model = DecisionScenario
        fields = ["topic", "evidence_chips", "scenarios", "model_used", "disclaimer"]

    def get_disclaimer(self, obj: DecisionScenario) -> str:
        return "이 시뮬레이션은 참고용이며 투자·부동산 권유가 아닙니다."


class JournalResponseSerializer(serializers.ModelSerializer):
    """일지 응답 시리얼라이저."""

    decision_scenario = DecisionScenarioInlineSerializer(read_only=True, allow_null=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "category",
            "title",
            "content",
            "ai_summary",
            "action_items",
            "mood_score",
            "related_goal_id",
            "reviewed_at",
            "review_note",
            "decision_scenario",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
