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
        preferred_region: 희망 지역 텍스트 (온보딩 입력).
        preferred_region_code: 법정동 코드 5자리 (MOLIT API 조회용).
        learning_interests: 학습 관심사 태그 목록.
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
    preferred_region = models.CharField(
        max_length=100,
        blank=True,
        help_text="희망 지역 (예: 서울 성동구). 온보딩 시 입력.",
    )
    preferred_region_code = models.CharField(
        max_length=10,
        blank=True,
        help_text="법정동 코드 5자리 (예: 11200). MOLIT API 조회용.",
    )
    learning_interests = models.JSONField(
        default=list,
        blank=True,
        help_text="학습 관심사 태그 목록 (예: ['IT', '금융'])",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "사용자"
        verbose_name_plural = "사용자 목록"

    def __str__(self) -> str:
        return f"{self.username} ({self.subscription_plan})"
