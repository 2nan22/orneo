# backend/apps/news/tasks.py
"""뉴스 분석 비동기 태스크."""

from __future__ import annotations

import logging
import time
from datetime import date

import httpx
from celery import shared_task
from django.conf import settings

from apps.news.models import MarketSector, NewsAnalysis, NewsSectorAnalysis
from apps.news.services.signal_adjustor import apply_metric_adjustment
from apps.news.services.stock_matcher import match_stocks

logger = logging.getLogger(__name__)

AI_SERVICE_URL = settings.AI_SERVICE_URL
AI_SERVICE_SECRET = settings.AI_SERVICE_SECRET


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def run_daily_news_analysis(
    self,
    target_date: str | None = None,
    market: str = "KR",
    sectors: list[str] | None = None,
    engine: str = "langgraph",
) -> dict:
    """매일 08:00 KST 실행 — 멀티-섹터 뉴스 분석 후 DB 저장.

    Args:
        target_date: 분석 대상 일자 ``YYYY-MM-DD``. 미지정 시 오늘.
        market: ``KR`` / ``US`` / ``ALL``. ``ALL`` 인 경우 KR 과 US 를 순차 실행한다.
        sectors: 분석 대상 섹터 키 목록. ``ALL`` 인 경우 무시되며 시장별 기본 섹터를
            ai_service 가 결정한다.
        engine: 그래프 엔진 식별자. 현재는 ``langgraph`` 만 지원.

    Returns:
        ``ALL`` 인 경우 ``{"results": [{market, analysis_id, run_duration_ms}, ...]}``,
        단일 시장인 경우 ``{"analysis_id": int, "run_duration_ms": int}``.
    """
    target_date = target_date or str(date.today())

    if market == "ALL":
        results = []
        for mkt in ("KR", "US"):
            results.append(_run_one_market(target_date, mkt, None, engine, self))
        return {"results": results}

    return _run_one_market(target_date, market, sectors, engine, self)


def _run_one_market(
    target_date: str,
    market: str,
    sectors: list[str] | None,
    engine: str,
    task,
) -> dict:
    """단일 시장 1회 분석 — ai_service 비스트리밍 호출 + DB 저장."""
    sectors = sectors or list(
        MarketSector.objects.filter(is_active=True, market__in=[market, "ALL"])
        .order_by("display_order")
        .values_list("sector_name_ko", flat=True)
    )

    analysis_obj, _ = NewsAnalysis.objects.update_or_create(
        analysis_date=target_date,
        market=market,
        engine_type=engine,
        defaults={"run_status": "RUNNING", "error_message": ""},
    )

    t0 = time.monotonic()
    try:
        resp = httpx.post(
            f"{AI_SERVICE_URL}/news/analyze",
            json={
                "target_date": target_date,
                "market": market,
                "sectors": sectors,
                "engine": engine,
            },
            headers={"X-Service-Secret": AI_SERVICE_SECRET},
            timeout=600,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        analysis_obj.run_status = "FAILED"
        analysis_obj.error_message = str(exc)
        analysis_obj.run_duration_ms = elapsed_ms
        analysis_obj.save()
        logger.error("[market=%s] 뉴스 분석 태스크 실패: %s", market, exc)
        raise task.retry(exc=exc)

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    signals = data.get("sector_signals", {}) or {}
    stocks_raw = data.get("sector_stocks", {}) or {}

    analysis_obj.run_status = "COMPLETED"
    analysis_obj.overall_analysis = data["overall_analysis"]
    analysis_obj.raw_result = {
        "sector_analyses": data["sector_analyses"],
        "sector_article_counts": data.get("sector_article_counts", {}),
        "sector_articles_meta": data.get("sector_articles_meta", {}),
        "sector_signals": signals,
        "sector_stocks": stocks_raw,
        "timings": data.get("timings", {}),
    }
    analysis_obj.run_duration_ms = elapsed_ms
    analysis_obj.save()

    sector_map = {
        s.sector_name_ko: s
        for s in MarketSector.objects.filter(
            sector_name_ko__in=sectors,
            market__in=[market, "ALL"],
        )
    }
    counts = data.get("sector_article_counts", {})
    for sector_name, analysis_text in data["sector_analyses"].items():
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

    logger.info("뉴스 분석 완료: %s %s (%d ms)", target_date, market, elapsed_ms)
    return {
        "market": market,
        "analysis_id": analysis_obj.id,
        "run_duration_ms": elapsed_ms,
    }
