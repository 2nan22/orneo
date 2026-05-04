"""AI-Agent 멀티-섹터 LangGraph 로직 (oreneo AI 서비스용)."""
import asyncio
import logging
import os
from typing import TypedDict

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from tavily import TavilyClient

from config import settings

logger = logging.getLogger(__name__)

KR_SECTOR_KEYWORDS: dict[str, str] = {
    "반도체": "반도체 DRAM 낸드 삼성전자 SK하이닉스",
    "AI":     "AI 인공지능 네이버 카카오 LG AI연구원",
    "조선":   "조선 해운 현대중공업 삼성중공업 한화오션",
    "원자재": "원자재 철강 포스코 구리 리튬",
    "에너지": "에너지 한국전력 SK에너지 발전 원전",
    "금융":   "금융 은행 KB 신한 하나 증시",
}
US_SECTOR_KEYWORDS: dict[str, str] = {
    "반도체": "semiconductor chip TSMC NVIDIA AMD",
    "AI":     "AI artificial intelligence OpenAI Google",
    "에너지": "energy oil gas Exxon Chevron",
    "금융":   "finance banking JPMorgan Goldman Fed",
}
DEFAULT_SECTORS = list(KR_SECTOR_KEYWORDS.keys())


class AgentState(TypedDict):
    target_date: str
    market: str
    sectors: list[str]
    watchlist_companies: list[str]
    sector_articles: dict[str, list[str]]
    sector_analyses: dict[str, str]
    overall_analysis: str
    error_count: int


def _make_llm() -> ChatOpenAI:
    base = settings.ollama_base_url.rstrip("/")
    if not base.endswith("/v1"):
        base = f"{base}/v1"
    return ChatOpenAI(
        base_url=base,
        api_key="ollama",
        model=os.environ.get("OLLAMA_MODEL", settings.gemma_model),
        temperature=0.3,
    )


async def multi_search_node(state: AgentState) -> dict:
    """섹터별 Tavily 검색."""
    market = state["market"]
    sector_articles: dict[str, list[str]] = {}

    for sector in state["sectors"]:
        kw = (US_SECTOR_KEYWORDS if market == "US" else KR_SECTOR_KEYWORDS).get(sector, sector)
        query = (
            f"{kw} news {state['target_date']}"
            if market == "US"
            else f"{kw} 뉴스 {state['target_date']}"
        )
        try:
            client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
            resp = await asyncio.to_thread(
                client.search, query=query, max_results=5, search_depth="basic"
            )
            sector_articles[sector] = [
                f"[{r.get('title','')}]\n{r.get('content','')[:400]}\n출처: {r.get('url','')}"
                for r in resp.get("results", [])
            ]
        except Exception as exc:
            logger.error("섹터 '%s' 검색 실패: %s", sector, exc)
            sector_articles[sector] = []

    total = sum(len(v) for v in sector_articles.values())
    return {
        "sector_articles": sector_articles,
        "error_count": state["error_count"] + (0 if total > 0 else 1),
    }


async def sector_analyze_node(state: AgentState) -> dict:
    """섹터별 분석 보고서 생성."""
    llm = _make_llm()
    sector_analyses: dict[str, str] = {}
    for sector, articles in state["sector_articles"].items():
        text = "\n\n---\n\n".join(articles) if articles else "검색 결과 없음."
        prompt = (
            f"[{sector}] 섹터 {state['target_date']} 금융 분석 보고서:\n"
            f"## Summary / ## Key Signals / ## Risk Factors 세 섹션을 포함하라.\n"
            f"[기사]\n{text}"
        )
        try:
            resp = await llm.ainvoke([HumanMessage(content=prompt)])
            sector_analyses[sector] = resp.content
        except Exception as exc:
            logger.warning("섹터 '%s' LLM 분석 실패, fallback 반환: %s", sector, exc)
            sector_analyses[sector] = (
                f"## Summary\n{sector} 섹터 분석을 생성하지 못했습니다.\n"
                f"## Key Signals\n수집된 기사 {len(articles)}건.\n"
                f"## Risk Factors\nLLM 호출 오류: {exc}"
            )
    return {"sector_analyses": sector_analyses}


async def aggregate_node(state: AgentState) -> dict:
    """전체 요약 생성."""
    llm = _make_llm()
    summaries = "\n\n".join(
        f"### {s}\n{a[:500]}" for s, a in state["sector_analyses"].items()
    )
    prompt = f"{state['target_date']} {state['market']} 멀티-섹터 종합 요약 (3-5문장):\n{summaries}"
    try:
        resp = await llm.ainvoke([HumanMessage(content=prompt)])
        overall = resp.content
    except Exception as exc:
        logger.warning("종합 요약 LLM 실패, fallback 반환: %s", exc)
        overall = f"{state['target_date']} {state['market']} 시장 뉴스가 수집되었습니다. LLM 분석 오류로 자동 요약이 생성되지 않았습니다."
    return {"overall_analysis": overall}


def _route(state: AgentState) -> str:
    total = sum(len(v) for v in state["sector_articles"].values())
    if total > 0 or state["error_count"] >= 2:
        return "sector_analyze_node"
    return "multi_search_node"


def build_news_graph():
    """뉴스 분석 StateGraph 컴파일."""
    b = StateGraph(AgentState)
    b.add_node("multi_search_node", multi_search_node)
    b.add_node("sector_analyze_node", sector_analyze_node)
    b.add_node("aggregate_node", aggregate_node)
    b.set_entry_point("multi_search_node")
    b.add_conditional_edges(
        "multi_search_node",
        _route,
        {"multi_search_node": "multi_search_node", "sector_analyze_node": "sector_analyze_node"},
    )
    b.add_edge("sector_analyze_node", "aggregate_node")
    b.add_edge("aggregate_node", END)
    return b.compile()
