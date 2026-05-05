# backend/apps/news/views.py
"""뉴스 분석 API 뷰."""

from __future__ import annotations

import json
import logging
from datetime import date

import httpx
from asgiref.sync import sync_to_async
from celery.result import AsyncResult
from django.conf import settings
from django.http import HttpRequest, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.news.models import MarketSector, NewsAnalysis, NewsSectorAnalysis
from apps.news.serializers import NewsAnalysisSerializer
from apps.news.services.signal_adjustor import apply_metric_adjustment
from apps.news.services.stock_matcher import match_stocks
from apps.news.tasks import run_daily_news_analysis

logger = logging.getLogger(__name__)


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


class NewsAnalysisLatestView(APIView):
    """가장 최근 완료된 뉴스 분석 결과를 반환한다.

    Query params:
        market: ``KR`` (기본) | ``US`` | ``ALL``.
            ``ALL`` 인 경우 KR/US 양시장의 가장 최근 완료된 row 를 묶은 ``FullAnalysis``
            구조로 반환한다.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        market = request.query_params.get("market", "KR")
        if market == "ALL":
            kr = self._latest_for("KR")
            us = self._latest_for("US")
            if not kr and not us:
                raise NotFound("아직 생성된 분석 결과가 없습니다.")
            anchor = kr or us
            payload = {
                "analysis_date": anchor.analysis_date.isoformat()
                if hasattr(anchor.analysis_date, "isoformat")
                else str(anchor.analysis_date),
                "run_duration_ms": anchor.run_duration_ms,
                "markets": {
                    "KR": NewsAnalysisSerializer(kr).data if kr else None,
                    "US": NewsAnalysisSerializer(us).data if us else None,
                },
            }
            return Response({"status": "success", "data": payload})

        obj = self._latest_for(market)
        if not obj:
            raise NotFound("아직 생성된 분석 결과가 없습니다.")
        return Response(
            {"status": "success", "data": NewsAnalysisSerializer(obj).data}
        )

    @staticmethod
    def _latest_for(market: str) -> NewsAnalysis | None:
        return (
            NewsAnalysis.objects.prefetch_related("sector_analyses__sector")
            .filter(market=market, run_status="COMPLETED")
            .order_by("-analysis_date")
            .first()
        )


class NewsAnalysisByDateView(APIView):
    """특정 일자(analysis_date) 분석을 반환한다.

    Query params:
        market: ``KR`` (기본) | ``US`` | ``ALL``.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, analysis_date: str) -> Response:
        market = request.query_params.get("market", "KR")
        if market == "ALL":
            kr = self._for_date(analysis_date, "KR")
            us = self._for_date(analysis_date, "US")
            if not kr and not us:
                raise NotFound(f"해당 일자({analysis_date}) 분석을 찾을 수 없습니다.")
            anchor = kr or us
            payload = {
                "analysis_date": anchor.analysis_date.isoformat()
                if hasattr(anchor.analysis_date, "isoformat")
                else str(anchor.analysis_date),
                "run_duration_ms": anchor.run_duration_ms,
                "markets": {
                    "KR": NewsAnalysisSerializer(kr).data if kr else None,
                    "US": NewsAnalysisSerializer(us).data if us else None,
                },
            }
            return Response({"status": "success", "data": payload})

        obj = self._for_date(analysis_date, market)
        if not obj:
            raise NotFound(f"해당 일자({analysis_date}) 분석을 찾을 수 없습니다.")
        return Response(
            {"status": "success", "data": NewsAnalysisSerializer(obj).data}
        )

    @staticmethod
    def _for_date(analysis_date: str, market: str) -> NewsAnalysis | None:
        return (
            NewsAnalysis.objects.prefetch_related("sector_analyses__sector")
            .filter(analysis_date=analysis_date, market=market)
            .order_by("-engine_type")
            .first()
        )


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


# ---------------------------------------------------------------------------
# 실시간 스트리밍 분석 — ai_service SSE를 그대로 통과시키며 complete 시 DB 저장
# ---------------------------------------------------------------------------


async def _authenticate_async(request: HttpRequest):
    """JWT 토큰을 비동기 컨텍스트에서 검증한다."""
    auth = JWTAuthentication()
    result = await sync_to_async(auth.authenticate, thread_sensitive=False)(request)
    if not result:
        raise PermissionError("authentication required")
    return result[0]


@sync_to_async(thread_sensitive=True)
def _persist_complete_payload(target_date: str, market: str, payload: dict) -> None:
    """SSE complete 페이로드를 영속화한다.

    market='ALL' 인 경우 payload['markets'] 안의 KR/US 두 시장을 각각 단일 시장
    처리로 위임한다. 단일 시장 호출은 기존 평면 구조 그대로 처리.
    """
    if "markets" in payload and isinstance(payload["markets"], dict):
        run_duration_ms = payload.get("run_duration_ms")
        for mkt, market_payload in payload["markets"].items():
            if not isinstance(market_payload, dict):
                continue
            _persist_one_market(target_date, mkt, market_payload, run_duration_ms)
        return

    _persist_one_market(target_date, market, payload, payload.get("run_duration_ms"))


def _persist_one_market(
    target_date: str,
    market: str,
    payload: dict,
    run_duration_ms: int | None,
) -> None:
    """단일 NewsAnalysis row 와 NewsSectorAnalysis 들을 update_or_create."""
    sector_analyses = payload.get("sector_analyses") or {}
    counts = payload.get("sector_article_counts") or {}
    signals = payload.get("sector_signals") or {}
    stocks_raw = payload.get("sector_stocks") or {}

    analysis_obj, _ = NewsAnalysis.objects.update_or_create(
        analysis_date=target_date,
        market=market,
        engine_type="langgraph",
        defaults={
            "run_status": "COMPLETED",
            "overall_analysis": payload.get("overall_analysis", ""),
            "raw_result": {
                "sector_analyses": sector_analyses,
                "sector_article_counts": counts,
                "sector_articles_meta": payload.get("sector_articles_meta", {}),
                "sector_signals": signals,
                "sector_stocks": stocks_raw,
                "timings": payload.get("timings", {}),
            },
            "run_duration_ms": run_duration_ms,
            "error_message": "",
        },
    )

    if not sector_analyses:
        return

    sector_map = {
        s.sector_name_ko: s
        for s in MarketSector.objects.filter(
            sector_name_ko__in=sector_analyses.keys(),
            market__in=[market, "ALL"],
        )
    }
    for sector_name, analysis_text in sector_analyses.items():
        sector_obj = sector_map.get(sector_name)
        if not sector_obj:
            continue
        raw_signal = int(signals.get(sector_name, 3))
        final_signal = apply_metric_adjustment(raw_signal, sector_name, market)
        matched = match_stocks(stocks_raw.get(sector_name, []), market)
        NewsSectorAnalysis.objects.update_or_create(
            analysis=analysis_obj,
            sector=sector_obj,
            defaults={
                "analysis_text": analysis_text,
                "article_count": counts.get(sector_name, 0),
                "investment_signal_raw": raw_signal,
                "investment_signal": final_signal,
                "recommended_stocks": matched,
            },
        )


@csrf_exempt
async def news_analysis_run_stream(request: HttpRequest):
    """SSE 프록시 — ai_service 스트림을 통과시키고 complete 이벤트 시 DB에 저장."""
    if request.method != "POST":
        return StreamingHttpResponse(b"", status=405)

    try:
        await _authenticate_async(request)
    except PermissionError:
        return StreamingHttpResponse(b"", status=401)
    except Exception as exc:
        logger.warning("SSE 인증 처리 실패: %s", exc)
        return StreamingHttpResponse(b"", status=401)

    try:
        body = json.loads((request.body or b"{}").decode("utf-8"))
    except json.JSONDecodeError:
        body = {}
    target_date = body.get("target_date") or str(date.today())
    market = body.get("market", "KR")

    if market == "ALL":
        # market=ALL 은 ai_service 에서 KR/US 각자 default_sectors_for() 로 결정
        sectors: list[str] = []
    else:
        sectors = await sync_to_async(list, thread_sensitive=True)(
            MarketSector.objects.filter(is_active=True, market__in=[market, "ALL"])
            .order_by("display_order")
            .values_list("sector_name_ko", flat=True)
        )

    async def event_stream():
        ai_url = f"{settings.AI_SERVICE_URL}/news/analyze/stream"
        headers = {"X-Service-Secret": settings.AI_SERVICE_SECRET or ""}
        payload = {
            "target_date": target_date,
            "market": market,
            "sectors": sectors,
        }

        last_event: str | None = None
        data_lines: list[str] = []

        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST", ai_url, json=payload, headers=headers
                ) as upstream:
                    if upstream.status_code != 200:
                        msg = f"ai_service status {upstream.status_code}"
                        logger.warning("SSE upstream 오류: %s", msg)
                        yield f'event: error\ndata: {{"message": "{msg}"}}\n\n'.encode("utf-8")
                        return
                    async for raw_line in upstream.aiter_lines():
                        # 프론트로 즉시 통과
                        yield (raw_line + "\n").encode("utf-8")

                        if raw_line.startswith("event: "):
                            last_event = raw_line[len("event: "):].strip()
                            data_lines = []
                        elif raw_line.startswith("data: "):
                            data_lines.append(raw_line[len("data: "):])
                        elif raw_line == "":
                            # 프레임 종료 — complete 이벤트면 DB 저장
                            if last_event == "complete" and data_lines:
                                try:
                                    payload_obj = json.loads("\n".join(data_lines))
                                    await _persist_complete_payload(
                                        target_date, market, payload_obj
                                    )
                                except Exception:
                                    logger.exception("complete 페이로드 저장 실패")
                            last_event = None
                            data_lines = []
        except httpx.HTTPError as exc:
            logger.exception("SSE upstream 연결 실패")
            err_msg = json.dumps({"message": str(exc)}, ensure_ascii=False)
            yield f"event: error\ndata: {err_msg}\n\n".encode("utf-8")
            return

        # SSE 표준상 마지막 빈 줄
        yield b"\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
