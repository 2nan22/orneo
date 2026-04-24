# backend/apps/journal/serializers.py
"""의사결정 일지 시리얼라이저."""

from __future__ import annotations

from rest_framework import serializers

from apps.journal.models import JournalCategory, JournalEntry


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


class JournalResponseSerializer(serializers.ModelSerializer):
    """일지 응답 시리얼라이저."""

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
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
