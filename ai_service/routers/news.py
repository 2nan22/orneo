import logging
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.news_graph import DEFAULT_SECTORS, AgentState, build_news_graph

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
    run_duration_ms: int


@router.post("/analyze", response_model=NewsAnalyzeResponse)
async def analyze_news(req: NewsAnalyzeRequest) -> NewsAnalyzeResponse:
    """멀티-섹터 뉴스 분석 실행."""
    logger.info("뉴스 분석 시작: %s %s %s", req.target_date, req.market, req.sectors)
    t0 = time.monotonic()
    try:
        graph = build_news_graph()
        initial: AgentState = {
            "target_date": req.target_date,
            "market": req.market,
            "sectors": req.sectors,
            "watchlist_companies": req.watchlist_companies,
            "sector_articles": {},
            "sector_analyses": {},
            "overall_analysis": "",
            "error_count": 0,
        }
        result = await graph.ainvoke(initial)
    except Exception as exc:
        logger.error("뉴스 분석 실패: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    return NewsAnalyzeResponse(
        overall_analysis=result["overall_analysis"],
        sector_analyses=result["sector_analyses"],
        run_duration_ms=elapsed_ms,
    )
