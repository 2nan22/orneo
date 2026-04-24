# backend/apps/journal/models.py
"""의사결정 일지 모델."""

from __future__ import annotations

from enum import StrEnum

from django.db import models


class JournalCategory(StrEnum):
    """일지 카테고리."""

    INVESTMENT = "investment"
    HOUSING = "housing"
    LEARNING = "learning"
    ROUTINE = "routine"
    GENERAL = "general"


class JournalEntry(models.Model):
    """사용자의 의사결정 일지.

    Attributes:
        user: 작성자.
        category: 일지 카테고리.
        title: 제목.
        content: 판단의 이유·근거.
        ai_summary: Gemma가 비동기 생성한 요약.
        action_items: 추천 행동 목록 (AI 생성).
        mood_score: 감정 점수 (1~5).
        related_goal: 연관 목표.
        reviewed_at: 복기 시각.
        review_note: 복기 메모.
        created_at: 작성 시각 (자동).
    """

    CATEGORY_CHOICES = [(c.value, c.value) for c in JournalCategory]

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="journal_entries",
    )
    category = models.CharField(max_length=15, choices=CATEGORY_CHOICES)
    title = models.CharField(max_length=200)
    content = models.TextField()
    ai_summary = models.TextField(blank=True)
    action_items = models.JSONField(default=list)
    mood_score = models.IntegerField(null=True, blank=True)
    related_goal = models.ForeignKey(
        "goals.Goal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="journal_entries",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "의사결정 일지"
        verbose_name_plural = "의사결정 일지 목록"

    def __str__(self) -> str:
        return f"[{self.category}] {self.title} (user_id={self.user_id})"
