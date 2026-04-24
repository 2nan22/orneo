# backend/apps/accounts/serializers.py
"""사용자 직렬화기."""

from __future__ import annotations

from rest_framework import serializers

from apps.accounts.models import CustomUser, RiskTolerance


class UserProfileSerializer(serializers.ModelSerializer):
    """사용자 프로필 응답 직렬화기."""

    class Meta:
        model = CustomUser
        fields = [
            "id",
            "username",
            "email",
            "subscription_plan",
            "risk_tolerance",
            "onboarded_at",
            "primary_provider",
            "created_at",
        ]
        read_only_fields = fields


class OnboardingSerializer(serializers.Serializer):
    """온보딩 입력 직렬화기."""

    monthly_savings_goal = serializers.IntegerField(min_value=0)
    total_asset_range = serializers.ChoiceField(
        choices=["~5000", "5000~1억", "1억~"]
    )
    housing_status = serializers.ChoiceField(choices=["전세", "월세", "자가"])
    preferred_region = serializers.CharField(max_length=50, required=False, allow_blank=True)
    risk_tolerance = serializers.ChoiceField(choices=RiskTolerance.values)
    learning_interests = serializers.ListField(
        child=serializers.CharField(),
        max_length=5,
        required=False,
        default=list,
    )
