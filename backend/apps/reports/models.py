# backend/apps/reports/models.py
"""주간 복기 리포트 모델."""

from __future__ import annotations

from django.db import models


class WeeklyReport(models.Model):
    """사용자 주간 복기 리포트.

    매주 월요일~일요일 구간의 목표 달성률, 일지 수, 행동 완료율,
    AI 요약을 통합하여 저장한다.

    Attributes:
        user: 리포트 소유자.
        week_start: 해당 주 시작일 (월요일).
        week_end: 해당 주 종료일 (일요일).
        capital_score: 주간 라이프 캐피털 점수 (0~100).
        goal_achievement_rate: 달성 목표 / 전체 활성 목표 (0.0~1.0).
        journal_count: 해당 주 일지 작성 수.
        action_completion_rate: 완료 행동 / 추천 행동 수 (0.0~1.0).
        highlights: 잘한 점 목록.
        improvements: 놓친 점 목록.
        next_week_action: 다음 주 핵심 행동 제안.
        ai_summary: AI 생성 주간 요약.
        created_at: 리포트 생성 시각.
    """

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="weekly_reports",
    )
    week_start = models.DateField()
    week_end = models.DateField()
    capital_score = models.IntegerField(default=0)
    goal_achievement_rate = models.FloatField(default=0.0)
    journal_count = models.IntegerField(default=0)
    action_completion_rate = models.FloatField(default=0.0)
    highlights = models.JSONField(default=list)
    improvements = models.JSONField(default=list)
    next_week_action = models.CharField(max_length=200, blank=True)
    ai_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-week_start"]
        unique_together = [["user", "week_start"]]
        verbose_name = "주간 복기 리포트"
        verbose_name_plural = "주간 복기 리포트 목록"

    def __str__(self) -> str:
        return f"[{self.week_start}~{self.week_end}] user_id={self.user_id} score={self.capital_score}"
