# backend/apps/accounts/models.py
"""사용자 모델."""

from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.db import models


class SubscriptionPlan(models.TextChoices):
    FREE = "free", "무료"
    PLUS = "plus", "플러스"
    PRO = "pro", "프로"


class RiskTolerance(models.TextChoices):
    CONSERVATIVE = "conservative", "안정형"
    MODERATE = "moderate", "중립형"
    AGGRESSIVE = "aggressive", "공격형"


class CustomUser(AbstractUser):
    """ORNEO 사용자 모델.

    소셜 로그인 사용자는 username이 자동 생성(email 기반)되며
    password는 사용 불가(unusable)로 설정된다.

    Attributes:
        subscription_plan: 구독 플랜 (free/plus/pro).
        risk_tolerance: 투자 성향.
        onboarded_at: 온보딩 완료 시각 (최초 1회).
        primary_provider: 소셜 로그인 제공자 (google/kakao/naver).
    """

    subscription_plan = models.CharField(
        max_length=10,
        choices=SubscriptionPlan.choices,
        default=SubscriptionPlan.FREE,
    )
    risk_tolerance = models.CharField(
        max_length=15,
        choices=RiskTolerance.choices,
        default=RiskTolerance.MODERATE,
    )
    onboarded_at = models.DateTimeField(null=True, blank=True)
    primary_provider = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "사용자"
        verbose_name_plural = "사용자 목록"

    def __str__(self) -> str:
        return f"{self.username} ({self.subscription_plan})"
