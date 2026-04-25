# backend/apps/dashboard/views.py
"""라이프 캐피털 대시보드 뷰."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from apps.dashboard.services import calculate_capital_score


class DashboardView(APIView):
    """라이프 캐피털 대시보드."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """대시보드 점수와 오늘의 행동·질문을 반환한다."""
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

        return Response({
            "status": "success",
            "data": {
                "score": result.capital_score,
                "asset_stability": result.asset_stability,
                "goal_progress": result.goal_progress,
                "routine_score": result.routine_score,
                "today_actions": actions,
                "key_question": key_question,
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
