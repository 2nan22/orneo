# backend/apps/dashboard/models.py
"""라이프 캐피털 대시보드 모델."""

from __future__ import annotations

from django.db import models


class CapitalScoreSnapshot(models.Model):
    """일별 라이프 캐피털 점수 스냅샷.

    Attributes:
        user: 점수 소유자.
        score_date: 점수 기준 날짜.
        capital_score: 종합 점수 (0~100).
        asset_stability: 자산 안정성 점수 (0~100).
        goal_progress: 목표 진척도 점수 (0~100).
        routine_score: 루틴 점수 (0~100).
        created_at: 스냅샷 생성 시각.
    """

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="capital_snapshots",
    )
    score_date = models.DateField()
    capital_score = models.FloatField()
    asset_stability = models.FloatField()
    goal_progress = models.FloatField()
    routine_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-score_date"]
        unique_together = [("user", "score_date")]
        verbose_name = "캐피털 점수 스냅샷"
        verbose_name_plural = "캐피털 점수 스냅샷 목록"

    def __str__(self) -> str:
        return f"[{self.score_date}] user_id={self.user_id} score={self.capital_score}"
