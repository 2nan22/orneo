import logging
import time
from datetime import date

import httpx
from celery import shared_task
from django.conf import settings

from apps.news.models import MarketSector, NewsAnalysis, NewsSectorAnalysis

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
    """매일 08:00 KST 실행 — 멀티-섹터 뉴스 분석 후 DB 저장."""
    target_date = target_date or str(date.today())
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
            timeout=300,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        analysis_obj.run_status = "FAILED"
        analysis_obj.error_message = str(exc)
        analysis_obj.run_duration_ms = elapsed_ms
        analysis_obj.save()
        logger.error("뉴스 분석 태스크 실패: %s", exc)
        raise self.retry(exc=exc)

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    analysis_obj.run_status = "COMPLETED"
    analysis_obj.overall_analysis = data["overall_analysis"]
    analysis_obj.raw_result = data["sector_analyses"]
    analysis_obj.run_duration_ms = elapsed_ms
    analysis_obj.save()

    sector_map = {
        s.sector_name_ko: s
        for s in MarketSector.objects.filter(sector_name_ko__in=sectors)
    }
    for sector_name, analysis_text in data["sector_analyses"].items():
        sector_obj = sector_map.get(sector_name)
        if sector_obj:
            NewsSectorAnalysis.objects.update_or_create(
                analysis=analysis_obj,
                sector=sector_obj,
                defaults={"analysis_text": analysis_text},
            )

    logger.info("뉴스 분석 완료: %s %s (%d ms)", target_date, market, elapsed_ms)
    return {"analysis_id": analysis_obj.id, "run_duration_ms": elapsed_ms}
