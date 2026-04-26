# backend/apps/goals/models.py
"""목표 모델."""

from __future__ import annotations

from django.db import models


class GoalCategory(models.TextChoices):
    FINANCIAL = "financial", "금융"
    HOUSING = "housing", "주거"
    LEARNING = "learning", "학습"
    ROUTINE = "routine", "루틴"


class Goal(models.Model):
    """사용자 목표.

    Attributes:
        user: 목표 소유자.
        category: 목표 카테고리.
        title: 목표 제목.
        description: 상세 설명.
        target_date: 목표 달성 기한.
        target_amount: 목표 금액 (금융·주거 목표).
        progress: 진척도 (0.0 ~ 1.0).
        is_active: 활성 여부.
    """

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="goals",
    )
    category = models.CharField(max_length=10, choices=GoalCategory.choices)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    target_date = models.DateField(null=True, blank=True)
    target_amount = models.DecimalField(
        max_digits=12, decimal_places=0, null=True, blank=True
    )
    progress = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "목표"
        verbose_name_plural = "목표 목록"

    def __str__(self) -> str:
        return f"[{self.category}] {self.title} ({self.user_id})"
