# backend/apps/goals/serializers.py
"""목표 직렬화기."""

from __future__ import annotations

from rest_framework import serializers

from apps.goals.models import Goal, GoalCategory


class GoalCreateSerializer(serializers.Serializer):
    """목표 생성 입력 직렬화기."""

    category = serializers.ChoiceField(choices=GoalCategory.values)
    title = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    target_date = serializers.DateField(required=False, allow_null=True, default=None)
    target_amount = serializers.DecimalField(
        max_digits=12, decimal_places=0, required=False, allow_null=True, default=None
    )


class GoalUpdateSerializer(serializers.Serializer):
    """목표 수정 입력 직렬화기."""

    title = serializers.CharField(max_length=100, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    target_date = serializers.DateField(required=False, allow_null=True)
    target_amount = serializers.DecimalField(
        max_digits=12, decimal_places=0, required=False, allow_null=True
    )
    progress = serializers.FloatField(min_value=0.0, max_value=1.0, required=False)
    is_active = serializers.BooleanField(required=False)


class GoalResponseSerializer(serializers.ModelSerializer):
    """목표 응답 직렬화기."""

    class Meta:
        model = Goal
        fields = [
            "id",
            "category",
            "title",
            "description",
            "target_date",
            "target_amount",
            "progress",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
