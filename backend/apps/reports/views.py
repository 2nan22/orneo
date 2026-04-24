# backend/apps/reports/views.py
"""주간 복기 리포트 뷰."""

from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.selectors import get_latest_report, get_report_history
from apps.reports.serializers import (
    WeeklyReportGenerateSerializer,
    WeeklyReportResponseSerializer,
)
from apps.reports.services import generate_weekly_report

logger = logging.getLogger(__name__)


class WeeklyReportListView(APIView):
    """주간 리포트 목록 조회."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """사용자의 주간 리포트 목록을 반환한다."""
        reports = get_report_history(user=request.user)
        serializer = WeeklyReportResponseSerializer(reports, many=True)
        return Response({"status": "success", "data": serializer.data})


class WeeklyReportLatestView(APIView):
    """최신 주간 리포트 조회."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """사용자의 가장 최근 주간 리포트를 반환한다."""
        report = get_latest_report(user=request.user)
        serializer = WeeklyReportResponseSerializer(report)
        return Response({"status": "success", "data": serializer.data})


class WeeklyReportGenerateView(APIView):
    """주간 리포트 수동 생성 (개발/테스트용)."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        """지정된 주 시작일로 리포트를 생성한다."""
        serializer = WeeklyReportGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = generate_weekly_report(
            user=request.user,
            week_start=serializer.validated_data["week_start"],
        )
        logger.info(
            "주간 리포트 수동 생성: user_id=%d week_start=%s",
            request.user.pk,
            report.week_start,
        )
        return Response(
            {"status": "success", "data": WeeklyReportResponseSerializer(report).data},
            status=status.HTTP_201_CREATED,
        )
