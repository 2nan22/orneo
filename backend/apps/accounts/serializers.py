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
            "preferred_region",
            "preferred_region_code",
            "learning_interests",
            "created_at",
        ]
        read_only_fields = fields


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """사용자 프로필 수정 직렬화기.

    수정 가능 필드만 허용한다.
    """

    class Meta:
        model = CustomUser
        fields = [
            "risk_tolerance",
            "preferred_region",
            "preferred_region_code",
            "learning_interests",
        ]

    def validate_learning_interests(self, value: list) -> list:
        """학습 관심사 최대 10개 제한."""
        if len(value) > 10:
            raise serializers.ValidationError("관심사는 최대 10개까지 입력 가능합니다.")
        return value


class OnboardingSerializer(serializers.Serializer):
    """온보딩 입력 직렬화기."""

    monthly_savings_goal = serializers.IntegerField(min_value=0)
    asset_range = serializers.ChoiceField(
        choices=["under_50m", "50m_to_200m", "over_200m"]
    )
    housing_status = serializers.ChoiceField(choices=["jeonse", "monthly_rent", "owned"])
    desired_region = serializers.CharField(max_length=50, required=False, allow_blank=True)
    risk_tolerance = serializers.ChoiceField(choices=RiskTolerance.values)
    learning_interests = serializers.ListField(
        child=serializers.CharField(),
        max_length=5,
        required=False,
        default=list,
    )
