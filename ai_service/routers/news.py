# ai_service/routers/news.py
"""뉴스 분석 라우터 (비스트리밍 + SSE 스트리밍)."""

import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.news_graph import DEFAULT_SECTORS, AgentState, build_news_graph
from services.news_stream import sse, translate_langgraph_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/news", tags=["news"])


class NewsAnalyzeRequest(BaseModel):
    target_date: str
    market: str = "KR"
    sectors: list[str] = DEFAULT_SECTORS
    watchlist_companies: list[str] = []
    engine: str = "langgraph"


class NewsAnalyzeResponse(BaseModel):
    overall_analysis: str
    sector_analyses: dict[str, str]
    sector_article_counts: dict[str, int]
    sector_articles_meta: dict[str, list[dict]] = {}
    sector_signals: dict[str, int] = {}
    sector_stocks: dict[str, list[str]] = {}
    timings: dict[str, Any] = {}
    run_duration_ms: int


def _initial_state(req: NewsAnalyzeRequest) -> AgentState:
    return {
        "target_date": req.target_date,
        "market": req.market,
        "sectors": req.sectors,
        "watchlist_companies": req.watchlist_companies,
        "sector_articles": {},
        "sector_articles_meta": {},
        "sector_article_counts": {},
        "sector_analyses": {},
        "sector_signals": {},
        "sector_stocks": {},
        "overall_analysis": "",
        "error_count": 0,
        "timings": {},
    }


@router.post("/analyze", response_model=NewsAnalyzeResponse)
async def analyze_news(req: NewsAnalyzeRequest) -> NewsAnalyzeResponse:
    """멀티-섹터 뉴스 분석 실행 (블로킹). 데일리 Celery 경로 전용."""
    logger.info("뉴스 분석 시작: %s %s %s", req.target_date, req.market, req.sectors)
    t0 = time.monotonic()
    try:
        graph = build_news_graph(streaming=False)
        result = await graph.ainvoke(_initial_state(req))
    except Exception as exc:
        logger.error("뉴스 분석 실패: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    return NewsAnalyzeResponse(
        overall_analysis=result["overall_analysis"],
        sector_analyses=result["sector_analyses"],
        sector_article_counts=result.get("sector_article_counts", {}),
        sector_articles_meta=result.get("sector_articles_meta", {}),
        sector_signals=result.get("sector_signals", {}),
        sector_stocks=result.get("sector_stocks", {}),
        timings=result.get("timings", {}),
        run_duration_ms=elapsed_ms,
    )


@router.post("/analyze/stream")
async def analyze_news_stream(req: NewsAnalyzeRequest) -> StreamingResponse:
    """LangGraph astream_events 기반 SSE 스트리밍 뉴스 분석.

    이벤트 프로토콜:
        graph_start  : {target_date, market, sectors}
        node_start   : {node, sector?}
        token        : {scope, sector?, text}
        node_done    : {node, sector?, full_text?}
        complete     : {overall_analysis, sector_analyses, sector_article_counts,
                        sector_articles_meta, timings, run_duration_ms}
        error        : {message}
    """

    async def event_gen():
        try:
            yield sse(
                "graph_start",
                {
                    "target_date": req.target_date,
                    "market": req.market,
                    "sectors": req.sectors,
                },
            )
            graph = build_news_graph(streaming=True)
            initial = _initial_state(req)
            t0 = time.monotonic()
            final_state: dict | None = None

            async for ev in graph.astream_events(initial, version="v2"):
                frame = translate_langgraph_event(ev)
                if frame:
                    yield frame
                etype = ev.get("event")
                name = ev.get("name")
                if etype == "on_chain_end" and name in ("LangGraph", "graph"):
                    output = ev.get("data", {}).get("output")
                    if isinstance(output, dict):
                        final_state = output

            run_ms = int((time.monotonic() - t0) * 1000)

            if final_state is None:
                yield sse("error", {"message": "그래프 실행 결과를 받지 못했습니다."})
                return

            yield sse(
                "complete",
                {
                    "overall_analysis": final_state.get("overall_analysis", ""),
                    "sector_analyses": final_state.get("sector_analyses", {}),
                    "sector_article_counts": final_state.get("sector_article_counts", {}),
                    "sector_articles_meta": final_state.get("sector_articles_meta", {}),
                    "sector_signals": final_state.get("sector_signals", {}),
                    "sector_stocks": final_state.get("sector_stocks", {}),
                    "timings": final_state.get("timings", {}),
                    "run_duration_ms": run_ms,
                },
            )
        except Exception as exc:
            logger.exception("스트리밍 분석 실패")
            yield sse("error", {"message": str(exc)})

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
