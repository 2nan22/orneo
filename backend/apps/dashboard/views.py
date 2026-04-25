# backend/apps/dashboard/views.py
"""라이프 캐피털 대시보드 뷰."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.services import calculate_capital_score


class DashboardView(APIView):
    """라이프 캐피털 대시보드."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """대시보드 점수와 요약 정보를 반환한다."""
        result = calculate_capital_score(user=request.user)
        return Response({
            "status": "success",
            "data": {
                "capital_score": result.capital_score,
                "breakdown": {
                    "asset_stability": result.asset_stability,
                    "goal_progress": result.goal_progress,
                    "routine_score": result.routine_score,
                },
                "active_goals_count": result.active_goals_count,
                "recent_journal_count": result.recent_journal_count,
                "today_actions": [],
                "key_question": "",
            },
        })
