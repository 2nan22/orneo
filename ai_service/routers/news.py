# ai_service/routers/news.py
"""뉴스 분석 라우터 (비스트리밍 + SSE 스트리밍)."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.news_graph import (
    DEFAULT_SECTORS,
    AgentState,
    build_news_graph,
    default_sectors_for,
)
from services.news_stream import sse, translate_langgraph_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/news", tags=["news"])

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


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
    return _initial_state_for(req, req.market)


def _initial_state_for(req: NewsAnalyzeRequest, market: str) -> AgentState:
    """단일 시장 그래프 1회 실행용 초기 state.

    Args:
        req: 원본 요청.
        market: 실제 그래프에 주입할 단일 시장 코드 (``KR`` / ``US``).
            ``req.market == "ALL"`` 인 다중 시장 호출에서는 호출자가 KR/US 를
            각각 지정한다.

    Returns:
        해당 시장에 맞는 sectors 가 채워진 ``AgentState`` dict.
    """
    if req.market == "ALL" or not req.sectors:
        sectors = default_sectors_for(market)
    else:
        sectors = req.sectors
    return {
        "target_date": req.target_date,
        "market": market,
        "sectors": sectors,
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
    if req.market == "ALL":
        raise HTTPException(
            status_code=400,
            detail="market=ALL 은 /news/analyze/stream 에서만 지원합니다.",
        )
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

    이벤트 프로토콜 (단일 시장):
        graph_start  : {target_date, market, sectors}
        node_start   : {node, market}
        token        : {scope, market, sector?, text}
        node_done    : {node, market, ...}
        complete     : {overall_analysis, sector_analyses, ..., run_duration_ms}
        error        : {message}

    이벤트 프로토콜 (market="ALL"):
        graph_start  : {target_date, market:"ALL", markets:["KR","US"], sectors_by_market}
        node_*/token : {market:"KR"|"US", ...}
        complete     : {analysis_date, target_date, run_duration_ms,
                        markets: {KR: {...}, US: {...}}}
    """
    if req.market == "ALL":
        return StreamingResponse(
            _multi_market_stream(req),
            media_type="text/event-stream",
            headers=_SSE_HEADERS,
        )
    return StreamingResponse(
        _single_market_stream(req),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


async def _single_market_stream(req: NewsAnalyzeRequest) -> AsyncIterator[bytes]:
    """단일 시장 그래프 1회 실행 + SSE."""
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
            frame = translate_langgraph_event(ev, market=req.market)
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
                "market": req.market,
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
        yield sse("error", {"message": str(exc), "market": req.market})


async def _multi_market_stream(req: NewsAnalyzeRequest) -> AsyncIterator[bytes]:
    """KR/US 두 그래프를 병렬 실행하고 이벤트를 interleaving 으로 SSE 출력."""
    sectors_by_market = {
        "KR": default_sectors_for("KR"),
        "US": default_sectors_for("US"),
    }
    yield sse(
        "graph_start",
        {
            "target_date": req.target_date,
            "market": "ALL",
            "markets": ["KR", "US"],
            "sectors_by_market": sectors_by_market,
        },
    )

    queue: asyncio.Queue[dict] = asyncio.Queue()
    final_states: dict[str, dict] = {}
    errors: dict[str, str] = {}

    async def run_one(market: str) -> None:
        try:
            graph = build_news_graph(streaming=True)
            initial = _initial_state_for(req, market)
            async for ev in graph.astream_events(initial, version="v2"):
                await queue.put({"market": market, "ev": ev})
                etype = ev.get("event")
                name = ev.get("name")
                if etype == "on_chain_end" and name in ("LangGraph", "graph"):
                    output = ev.get("data", {}).get("output")
                    if isinstance(output, dict):
                        final_states[market] = output
        except Exception as exc:
            logger.exception("[market=%s] 그래프 실행 실패", market)
            errors[market] = str(exc)
        finally:
            await queue.put({"market": market, "ev": None})

    t0 = time.monotonic()
    runners = [asyncio.create_task(run_one("KR")), asyncio.create_task(run_one("US"))]

    finished = 0
    try:
        while finished < 2:
            item = await queue.get()
            ev = item["ev"]
            if ev is None:
                finished += 1
                continue
            frame = translate_langgraph_event(ev, market=item["market"])
            if frame:
                yield frame

        await asyncio.gather(*runners, return_exceptions=True)
        run_ms = int((time.monotonic() - t0) * 1000)

        for mkt, msg in errors.items():
            yield sse("error", {"market": mkt, "message": msg})

        if not final_states:
            yield sse(
                "error",
                {"message": "그래프 실행 결과를 받지 못했습니다."},
            )
            return

        yield sse(
            "complete",
            {
                "analysis_date": req.target_date,
                "target_date": req.target_date,
                "run_duration_ms": run_ms,
                "markets": {
                    mkt: {
                        "market": mkt,
                        "overall_analysis": st.get("overall_analysis", ""),
                        "sector_analyses": st.get("sector_analyses", {}),
                        "sector_article_counts": st.get("sector_article_counts", {}),
                        "sector_articles_meta": st.get("sector_articles_meta", {}),
                        "sector_signals": st.get("sector_signals", {}),
                        "sector_stocks": st.get("sector_stocks", {}),
                        "timings": st.get("timings", {}),
                    }
                    for mkt, st in final_states.items()
                },
            },
        )
    except Exception as exc:
        logger.exception("multi market 스트리밍 실패")
        yield sse("error", {"message": str(exc)})
        for r in runners:
            r.cancel()
