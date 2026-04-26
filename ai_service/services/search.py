# ai_service/services/search.py
"""웹 검색 서비스 — Tavily API 기반."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

MAX_RESULTS = 3
MAX_CONTENT_LEN = 300  # 검색 결과 1건당 최대 문자 수


async def search_recent_news(query: str, *, api_key: str) -> list[str]:
    """Tavily로 최신 뉴스를 검색하고 요약 텍스트 목록을 반환한다.

    Args:
        query: 검색 쿼리 (예: "삼성전자 주가 최근 뉴스").
        api_key: Tavily API 키.

    Returns:
        검색 결과 요약 문자열 목록. API 키 미설정 또는 실패 시 빈 리스트.
    """
    if not api_key:
        return []

    try:
        from tavily import AsyncTavilyClient  # 지연 임포트 — API 키 없으면 미호출
        client = AsyncTavilyClient(api_key=api_key)
        response = await client.search(
            query=query,
            search_depth="basic",
            max_results=MAX_RESULTS,
            include_answer=False,
        )
        snippets = []
        for r in response.get("results", []):
            title = r.get("title", "")
            content = r.get("content", "")[:MAX_CONTENT_LEN]
            url = r.get("url", "")
            snippets.append(f"[{title}] {content} (출처: {url})")
        logger.info("[Tavily] 검색 완료: query=%s count=%d", query, len(snippets))
        return snippets
    except Exception as exc:
        logger.warning("[Tavily] 검색 실패, 생략: %s", exc)
        return []
