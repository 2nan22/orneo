# backend/apps/news/views.py
"""뉴스 분석 API 뷰."""

from __future__ import annotations

from datetime import date

from celery.result import AsyncResult
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.news.models import NewsAnalysis
from apps.news.serializers import NewsAnalysisSerializer
from apps.news.tasks import run_daily_news_analysis


class NewsAnalysisListView(generics.ListAPIView):
    """최근 뉴스 분석 결과 목록."""

    serializer_class = NewsAnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = NewsAnalysis.objects.prefetch_related("sector_analyses__sector").order_by("-analysis_date")
        market = self.request.query_params.get("market")
        if market:
            qs = qs.filter(market=market)
        return qs[:30]


class NewsAnalysisDetailView(generics.RetrieveAPIView):
    """뉴스 분석 결과 상세 (pk)."""

    serializer_class = NewsAnalysisSerializer
    permission_classes = [IsAuthenticated]
    queryset = NewsAnalysis.objects.prefetch_related("sector_analyses__sector")


class NewsAnalysisLatestView(generics.RetrieveAPIView):
    """가장 최근 완료된 뉴스 분석 결과를 반환한다.

    Query params:
        market: KR(기본) | US | ALL.
    """

    serializer_class = NewsAnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        market = self.request.query_params.get("market", "KR")
        obj = (
            NewsAnalysis.objects.prefetch_related("sector_analyses__sector")
            .filter(market=market, run_status="COMPLETED")
            .order_by("-analysis_date")
            .first()
        )
        if not obj:
            raise NotFound("아직 생성된 분석 결과가 없습니다.")
        return obj


class NewsAnalysisByDateView(generics.RetrieveAPIView):
    """특정 일자(analysis_date) 분석을 반환한다."""

    serializer_class = NewsAnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        target_date = self.kwargs["analysis_date"]
        market = self.request.query_params.get("market", "KR")
        obj = (
            NewsAnalysis.objects.prefetch_related("sector_analyses__sector")
            .filter(analysis_date=target_date, market=market)
            .order_by("-engine_type")
            .first()
        )
        if not obj:
            raise NotFound(f"해당 일자({target_date}) 분석을 찾을 수 없습니다.")
        return obj


class NewsAnalysisRunView(APIView):
    """수동으로 뉴스 분석을 실행한다.

    Body:
        market: KR(기본) | US | ALL.
        target_date: YYYY-MM-DD (기본: 오늘).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        market = request.data.get("market", "KR")
        target_date = request.data.get("target_date") or str(date.today())
        task = run_daily_news_analysis.apply_async(
            kwargs={"target_date": target_date, "market": market},
        )
        return Response(
            {
                "task_id": task.id,
                "state": "PENDING",
                "target_date": target_date,
                "market": market,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class NewsAnalysisTaskStatusView(APIView):
    """Celery 태스크 상태 조회 (수동 트리거 폴링용)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, task_id: str) -> Response:
        result = AsyncResult(task_id)
        payload: dict = {"task_id": task_id, "state": result.state}
        if result.successful():
            payload["result"] = result.result
        elif result.failed():
            payload["error"] = str(result.result) if result.result else "task failed"
        return Response(payload)
