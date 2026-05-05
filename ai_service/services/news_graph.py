# ai_service/services/news_graph.py
"""AI-Agent 멀티-섹터 LangGraph 로직 (oreneo AI 서비스용)."""
import asyncio
import logging
import os
import time
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from tavily import TavilyClient

from config import settings
from services.sector_parser import split_sector_response

logger = logging.getLogger(__name__)

SECTOR_ANALYZE_SYSTEM = """\
너는 한국·미국 시장의 섹터 애널리스트다. 사용자가 제공한 뉴스 기사 모음을 읽고
다음 규칙을 엄격히 지켜 보고서를 한국어로 작성한다.

규칙:
1. 출력은 정확히 세 섹션으로 구성한다. 헤더는 `## Summary`, `## Key Signals`,
   `## Risk Factors`. 다른 헤더·이모지·머리말·맺음말을 절대 추가하지 않는다.
2. 각 섹션은 2~4문장의 짧은 단락 1개 또는 3~5개의 불릿 리스트(`- `)로 한정한다.
3. 수치·종목명·날짜는 기사 본문에 등장한 것만 인용한다. 추측·미확인 사실 금지.
4. 마지막 섹션 뒤에 반드시 다음 형식의 JSON 블록을 추가한다:

```json
{"investment_signal": <1-5>, "recommended_stocks": ["종목1", "종목2", "종목3"]}
```

   - investment_signal: 1=적극 매도, 2=비중 축소, 3=중립, 4=비중 확대, 5=적극 매수.
     기사가 0건이거나 판단 불가 시 3 (중립).
   - recommended_stocks: 본문에서 언급된 상장 종목명만 인용한다. 한국 시장이면
     한글 정식명(예: "삼성전자"), 미국 시장이면 한글 또는 영문 회사명. 최대 5개.
     기사가 0건이면 빈 배열.

5. JSON 블록 외 추가 코드 펜스는 금지. 마지막 줄은 빈 줄 없이 끝낸다.
6. 기사가 0건이면 세 섹션 모두 "수집된 기사가 없어 분석을 생성할 수 없습니다." 로 채우고,
   JSON 은 `{"investment_signal": 3, "recommended_stocks": []}` 로 한다.
"""

AGGREGATE_SYSTEM = """\
너는 시장 종합 분석가다. 사용자가 제공한 섹터별 분석 보고서를 읽고
다음 규칙을 엄격히 지켜 종합 요약을 한국어로 작성한다.

규칙:
1. 출력은 4~6문장의 단락 1개로만 구성한다. 헤더·불릿·이모지·코드펜스를 추가하지 않는다.
2. 섹터 간의 공통 흐름과 가장 두드러진 차이를 함께 짚는다.
3. 수치·종목명은 입력 보고서에 등장한 것만 인용한다. 추측·미확인 사실 금지.
4. 마지막 줄은 빈 줄 없이 끝낸다.
"""

KR_SECTOR_KEYWORDS: dict[str, str] = {
    "반도체":      "반도체 DRAM 낸드 삼성전자 SK하이닉스",
    "AI":          "AI 인공지능 네이버 카카오 LG AI연구원",
    "자동차":      "자동차 현대차 기아 하이브리드 전기차",
    "조선":        "조선 해운 현대중공업 삼성중공업 한화오션 LNG",
    "제약/바이오": "제약 바이오 셀트리온 삼성바이오로직스 신약",
    "에너지":      "에너지 한국전력 SK에너지 발전 원전 SMR",
    "금융":        "금융 은행 KB 신한 하나 증시 밸류업",
}
US_SECTOR_KEYWORDS: dict[str, str] = {
    "빅테크":     "big tech Apple Microsoft Alphabet Meta",
    "AI/반도체":  "semiconductor chip TSMC NVIDIA AMD AI",
    "전기차":     "EV electric vehicle Tesla Rivian Lucid BYD",
    "헬스케어":   "healthcare biotech Eli Lilly Novo Nordisk GLP-1",
    "에너지":     "energy oil gas Exxon Chevron utility",
    "금융":       "finance banking JPMorgan Goldman Fed",
}
DEFAULT_SECTORS_KR = list(KR_SECTOR_KEYWORDS.keys())
DEFAULT_SECTORS_US = list(US_SECTOR_KEYWORDS.keys())
DEFAULT_SECTORS = DEFAULT_SECTORS_KR  # 호환성 유지 (단일 시장 KR 기본)


def default_sectors_for(market: str) -> list[str]:
    """시장 코드에 대응하는 기본 섹터 키 리스트를 반환한다.

    Args:
        market: ``"KR"`` 또는 ``"US"``. 그 외 값은 KR 으로 폴백.

    Returns:
        해당 시장의 기본 섹터 한국어 키 리스트.
    """
    if market == "US":
        return DEFAULT_SECTORS_US
    return DEFAULT_SECTORS_KR


class AgentState(TypedDict):
    target_date: str
    market: str
    sectors: list[str]
    watchlist_companies: list[str]
    sector_articles: dict[str, list[str]]
    sector_articles_meta: dict[str, list[dict]]
    sector_article_counts: dict[str, int]
    sector_analyses: dict[str, str]
    sector_signals: dict[str, int]
    sector_stocks: dict[str, list[str]]
    overall_analysis: str
    error_count: int
    timings: dict[str, Any]


def _make_llm(streaming: bool = False) -> ChatOpenAI:
    """Ollama 호환 ChatOpenAI 인스턴스를 생성한다.

    Args:
        streaming: True면 ainvoke 호출 시 토큰 단위 스트림 이벤트가 emit된다.
    """
    base = settings.ollama_base_url.rstrip("/")
    if not base.endswith("/v1"):
        base = f"{base}/v1"
    return ChatOpenAI(
        base_url=base,
        api_key="ollama",
        model=os.environ.get("OLLAMA_MODEL", settings.gemma_model),
        temperature=0.3,
        streaming=streaming,
    )


async def multi_search_node(state: AgentState) -> dict:
    """섹터별 Tavily 검색."""
    t0 = time.monotonic()
    market = state["market"]
    sector_articles: dict[str, list[str]] = {}
    sector_articles_meta: dict[str, list[dict]] = {}

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
            results = resp.get("results", [])
            sector_articles[sector] = [
                f"[{r.get('title','')}]\n{r.get('content','')[:400]}\n출처: {r.get('url','')}"
                for r in results
            ]
            sector_articles_meta[sector] = [
                {"title": r.get("title", ""), "url": r.get("url", "")}
                for r in results
            ]
        except Exception as exc:
            logger.error("섹터 '%s' 검색 실패: %s", sector, exc)
            sector_articles[sector] = []
            sector_articles_meta[sector] = []

    total = sum(len(v) for v in sector_articles.values())
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    return {
        "sector_articles": sector_articles,
        "sector_articles_meta": sector_articles_meta,
        "error_count": state["error_count"] + (0 if total > 0 else 1),
        "timings": {**state.get("timings", {}), "multi_search_ms": elapsed_ms},
    }


def _make_sector_analyze_node(streaming: bool):
    """sector_analyze 노드 함수를 streaming 플래그 closure로 생성."""

    async def sector_analyze_node(state: AgentState) -> dict:
        """섹터별 분석 보고서 + 시그널/종목 메타 추출."""
        llm = _make_llm(streaming=streaming)
        sector_analyses: dict[str, str] = {}
        sector_signals: dict[str, int] = {}
        sector_stocks: dict[str, list[str]] = {}
        sector_ms: dict[str, int] = {}
        for sector, articles in state["sector_articles"].items():
            text = "\n\n---\n\n".join(articles) if articles else "검색 결과 없음."
            user_prompt = (
                f"대상: [{sector}] 섹터 / {state['target_date']} / 시장 {state['market']}\n\n"
                f"[기사 모음]\n{text}"
            )
            t0 = time.monotonic()
            try:
                resp = await llm.ainvoke(
                    [
                        SystemMessage(content=SECTOR_ANALYZE_SYSTEM),
                        HumanMessage(content=user_prompt),
                    ],
                    config={"tags": [f"sector:{sector}"], "run_name": f"sector_llm:{sector}"},
                )
                analysis_text, meta = split_sector_response(resp.content)
                sector_analyses[sector] = analysis_text
                sector_signals[sector] = meta["investment_signal_raw"]
                sector_stocks[sector] = meta["recommended_stock_names"]
            except Exception as exc:
                logger.warning("섹터 '%s' LLM 분석 실패, fallback 반환: %s", sector, exc)
                sector_analyses[sector] = (
                    "## Summary\n"
                    f"{sector} 섹터 분석을 생성하지 못했습니다.\n"
                    "## Key Signals\n"
                    f"수집된 기사 {len(articles)}건. LLM 호출 오류로 인해 신호를 추출하지 못했습니다.\n"
                    "## Risk Factors\n"
                    "분석 결과 신뢰성이 낮으므로 직접 출처 기사를 확인하시기 바랍니다."
                )
                sector_signals[sector] = 3
                sector_stocks[sector] = []
            finally:
                sector_ms[sector] = int((time.monotonic() - t0) * 1000)
        return {
            "sector_analyses": sector_analyses,
            "sector_signals": sector_signals,
            "sector_stocks": sector_stocks,
            "timings": {**state.get("timings", {}), "sector_analyze_ms": sector_ms},
        }

    return sector_analyze_node


def _make_aggregate_node(streaming: bool):
    """aggregate 노드 함수를 streaming 플래그 closure로 생성."""

    async def aggregate_node(state: AgentState) -> dict:
        """전체 요약 생성."""
        t0 = time.monotonic()
        llm = _make_llm(streaming=streaming)
        summaries = "\n\n".join(
            f"### {s}\n{a[:800]}" for s, a in state["sector_analyses"].items()
        )
        user_prompt = (
            f"대상: {state['target_date']} {state['market']} 시장 멀티-섹터 종합 요약\n\n"
            f"[섹터별 분석 보고서]\n{summaries}"
        )
        try:
            resp = await llm.ainvoke(
                [
                    SystemMessage(content=AGGREGATE_SYSTEM),
                    HumanMessage(content=user_prompt),
                ],
                config={"tags": ["aggregate"], "run_name": "aggregate_llm"},
            )
            overall = resp.content
        except Exception as exc:
            logger.warning("종합 요약 LLM 실패, fallback 반환: %s", exc)
            overall = (
                f"{state['target_date']} {state['market']} 시장 뉴스가 수집되었습니다. "
                "LLM 분석 오류로 자동 요약이 생성되지 않았습니다."
            )
        elapsed_ms = int((time.monotonic() - t0) * 1000)
        timings = {**state.get("timings", {}), "aggregate_ms": elapsed_ms}
        timings["total_ms"] = (
            timings.get("multi_search_ms", 0)
            + sum(timings.get("sector_analyze_ms", {}).values())
            + timings.get("aggregate_ms", 0)
        )
        sector_article_counts = {
            s: len(arts) for s, arts in state["sector_articles"].items()
        }
        return {
            "overall_analysis": overall,
            "sector_article_counts": sector_article_counts,
            "sector_articles_meta": state.get("sector_articles_meta", {}),
            "timings": timings,
        }

    return aggregate_node


def _route(state: AgentState) -> str:
    total = sum(len(v) for v in state["sector_articles"].values())
    if total > 0 or state["error_count"] >= 2:
        return "sector_analyze_node"
    return "multi_search_node"


def build_news_graph(streaming: bool = False):
    """뉴스 분석 StateGraph 컴파일.

    Args:
        streaming: True면 sector_analyze/aggregate 노드의 LLM 호출이 토큰 단위
            스트림 이벤트(`on_chat_model_stream`)를 emit한다. 비스트리밍 경로는
            False(기본값) — 이때 LLM은 한 번에 전체 응답을 반환한다.
    """
    b = StateGraph(AgentState)
    b.add_node("multi_search_node", multi_search_node)
    b.add_node("sector_analyze_node", _make_sector_analyze_node(streaming))
    b.add_node("aggregate_node", _make_aggregate_node(streaming))
    b.set_entry_point("multi_search_node")
    b.add_conditional_edges(
        "multi_search_node",
        _route,
        {"multi_search_node": "multi_search_node", "sector_analyze_node": "sector_analyze_node"},
    )
    b.add_edge("sector_analyze_node", "aggregate_node")
    b.add_edge("aggregate_node", END)
    return b.compile()
