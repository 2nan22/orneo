# ai_service/services/news_stream.py
"""LangGraph astream_events 이벤트 → SSE 프레임 변환."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

NODE_NAMES = {"multi_search_node", "sector_analyze_node", "aggregate_node"}


def sse(event: str, data: dict) -> bytes:
    """SSE 한 프레임을 bytes로 만들어 반환한다.

    Args:
        event: SSE event 이름.
        data: JSON 직렬화 가능한 dict.

    Returns:
        ``event: <event>\\ndata: <json>\\n\\n`` 형식의 UTF-8 바이트.
    """
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n".encode("utf-8")


def _extract_sector_from_tags(tags: list[str]) -> str | None:
    for t in tags:
        if isinstance(t, str) and t.startswith("sector:"):
            return t.split(":", 1)[1]
    return None


def translate_langgraph_event(
    ev: dict[str, Any], *, market: str | None = None
) -> bytes | None:
    """LangGraph ``astream_events`` 이벤트 1건을 SSE 프레임으로 변환한다.

    Args:
        ev: ``astream_events(version="v2")`` 가 emit하는 이벤트 dict.
            주요 키: ``event``(이벤트 타입), ``name``(노드/모델 이름), ``tags``,
            ``data``(chunk/input/output).
        market: 단일/다중 시장 양쪽에서 호출 가능. 값이 주어지면 모든 페이로드에
            ``market`` 필드가 추가된다. 다중 시장(market=ALL) 분기에서 KR/US 두
            그래프의 이벤트를 구분하는 용도로 사용한다.

    Returns:
        SSE 프레임 bytes. 클라이언트로 보낼 필요가 없는 이벤트이면 None.
    """
    name = ev.get("name") or ""
    etype = ev.get("event") or ""
    tags = ev.get("tags") or []

    # 1) 노드 시작 / 끝
    if etype == "on_chain_start" and name in NODE_NAMES:
        payload: dict[str, Any] = {"node": name}
        if market:
            payload["market"] = market
        return sse("node_start", payload)
    if etype == "on_chain_end" and name in NODE_NAMES:
        data = ev.get("data", {}) or {}
        output = data.get("output")
        payload = {"node": name}
        if market:
            payload["market"] = market
        if isinstance(output, dict):
            # sector_analyze_node 의 경우 누적 sector_analyses, aggregate_node 의 경우
            # overall_analysis 텍스트를 함께 실어 프론트에서 누적값 보정에 사용한다.
            if "sector_analyses" in output:
                payload["sector_analyses"] = output["sector_analyses"]
            if "sector_signals" in output:
                payload["sector_signals"] = output["sector_signals"]
            # 매칭 전 LLM 원본 종목명 — UI 즉시 표시용 (마스터 매칭은 complete 이후 DB 재조회)
            if "sector_stocks" in output:
                payload["sector_stocks_raw"] = output["sector_stocks"]
            if "overall_analysis" in output:
                payload["full_text"] = output["overall_analysis"]
            if "sector_article_counts" in output:
                payload["sector_article_counts"] = output["sector_article_counts"]
        return sse("node_done", payload)

    # 2) 토큰 스트림 (Gemma 응답)
    if etype == "on_chat_model_stream":
        chunk = ev.get("data", {}).get("chunk")
        text = getattr(chunk, "content", "") if chunk is not None else ""
        if not text:
            return None
        sector = _extract_sector_from_tags(tags)
        scope = "sector" if sector else "aggregate"
        payload = {"scope": scope, "text": text}
        if sector:
            payload["sector"] = sector
        if market:
            payload["market"] = market
        return sse("token", payload)

    return None
