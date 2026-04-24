# backend/apps/goals/views.py
"""목표 뷰."""

from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.goals.selectors import get_user_goals
from apps.goals.serializers import GoalCreateSerializer, GoalResponseSerializer, GoalUpdateSerializer
from apps.goals.services import create_goal, update_goal

logger = logging.getLogger(__name__)


class GoalListCreateView(APIView):
    """목표 목록 조회 및 생성."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """사용자의 목표 목록을 반환한다."""
        category = request.query_params.get("category")
        goals = get_user_goals(user=request.user, category=category)
        serializer = GoalResponseSerializer(goals, many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request: Request) -> Response:
        """새 목표를 생성한다."""
        serializer = GoalCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        goal = create_goal(user=request.user, **serializer.validated_data)
        return Response(
            {"status": "success", "data": GoalResponseSerializer(goal).data},
            status=status.HTTP_201_CREATED,
        )


class GoalDetailView(APIView):
    """목표 상세 조회 및 수정."""

    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, goal_id: int) -> Response:
        """목표를 부분 수정한다."""
        serializer = GoalUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        goal = update_goal(goal_id=goal_id, user=request.user, data=serializer.validated_data)
        return Response({"status": "success", "data": GoalResponseSerializer(goal).data})
