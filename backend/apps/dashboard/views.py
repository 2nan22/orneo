# backend/apps/dashboard/views.py
"""라이프 캐피털 대시보드 뷰."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.services import calculate_capital_score

logger = logging.getLogger(__name__)


def _get_delta(user, today) -> dict | None:
    """이번 주와 7일 전 스냅샷을 비교하여 델타를 반환한다.

    Args:
        user: 스냅샷 조회 대상 사용자.
        today: 오늘 날짜.

    Returns:
        델타 딕셔너리 또는 기준 스냅샷 없으면 None.
    """
    from apps.dashboard.models import CapitalScoreSnapshot

    try:
        current = CapitalScoreSnapshot.objects.get(user=user, score_date=today)
    except CapitalScoreSnapshot.DoesNotExist:
        return None

    last_week = today - timedelta(days=7)
    try:
        previous = CapitalScoreSnapshot.objects.get(user=user, score_date=last_week)
    except CapitalScoreSnapshot.DoesNotExist:
        # 7일 전 스냅샷 없으면 최근 7일 내 가장 오래된 스냅샷으로 비교
        previous = (
            CapitalScoreSnapshot.objects
            .filter(user=user, score_date__lt=today)
            .order_by("-score_date")
            .first()
        )
        if previous is None:
            return None

    return {
        "score":           round(current.capital_score   - previous.capital_score,   1),
        "asset_stability": round(current.asset_stability - previous.asset_stability, 1),
        "goal_progress":   round(current.goal_progress   - previous.goal_progress,   1),
        "routine_score":   round(current.routine_score   - previous.routine_score,   1),
    }


class DashboardView(APIView):
    """라이프 캐피털 대시보드."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """대시보드 점수, 델타, 오늘의 행동·질문을 반환한다."""
        from apps.dashboard.models import DailyKeyQuestion, TodayAction

        result = calculate_capital_score(user=request.user)
        today = timezone.localdate()

        actions = list(
            TodayAction.objects.filter(user=request.user, action_date=today)
            .values("id", "text", "category", "completed")
        )

        key_question = ""
        try:
            kq = DailyKeyQuestion.objects.get(user=request.user, question_date=today)
            key_question = kq.question
        except DailyKeyQuestion.DoesNotExist:
            pass

        delta = _get_delta(user=request.user, today=today)

        brief_summary = ""
        try:
            from apps.reports.models import WeeklyReport
            latest_report = (
                WeeklyReport.objects.filter(user=request.user)
                .order_by("-week_start")
                .first()
            )
            if latest_report and latest_report.ai_summary:
                brief_summary = (
                    latest_report.ai_summary[:120]
                    + ("..." if len(latest_report.ai_summary) > 120 else "")
                )
        except Exception:
            pass

        return Response({
            "status": "success",
            "data": {
                "score": result.capital_score,
                "asset_stability": result.asset_stability,
                "goal_progress": result.goal_progress,
                "routine_score": result.routine_score,
                "delta": delta,
                "today_actions": actions,
                "key_question": key_question,
                "brief_summary": brief_summary,
            },
        })

    def patch(self, request: Request) -> Response:
        """오늘 행동 완료 여부를 업데이트한다."""
        from apps.dashboard.models import TodayAction

        action_id = request.data.get("action_id")
        completed = request.data.get("completed")

        if action_id is None or completed is None:
            return Response(
                {"status": "error", "message": "action_id, completed 필드가 필요합니다."},
                status=400,
            )

        updated = TodayAction.objects.filter(
            id=action_id, user=request.user, action_date=timezone.localdate()
        ).update(completed=completed)

        if not updated:
            return Response({"status": "error", "message": "행동을 찾을 수 없습니다."}, status=404)

        return Response({"status": "success"})
