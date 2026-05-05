# ai_service/services/sector_parser.py
"""섹터 분석 LLM 응답 파서 — 분석 텍스트와 시그널/종목 메타를 분리."""

from __future__ import annotations

import json
import logging
import re
from typing import TypedDict

logger = logging.getLogger(__name__)

_JSON_FENCE_RE = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)


class SectorMeta(TypedDict):
    investment_signal_raw: int
    recommended_stock_names: list[str]


def split_sector_response(content: str) -> tuple[str, SectorMeta]:
    """LLM 응답을 분석 텍스트 + 메타 dict 로 분리한다.

    Args:
        content: LLM 원본 응답 (마크다운 + ```json 블록).

    Returns:
        ``(analysis_text, meta)`` 튜플.

        - ``analysis_text``: JSON 블록을 제거한 본문.
        - ``meta``: ``investment_signal_raw`` (1~5 정수) 와
          ``recommended_stock_names`` (문자열 배열, 최대 5개).

    Notes:
        JSON 블록을 찾지 못하거나 파싱 실패 시 fallback 으로
        ``signal=3, stocks=[]`` 을 반환하고 본문은 원본 그대로 둔다.
    """
    match = _JSON_FENCE_RE.search(content)
    if not match:
        return content.strip(), {
            "investment_signal_raw": 3,
            "recommended_stock_names": [],
        }

    body = (content[: match.start()] + content[match.end():]).rstrip()
    try:
        data = json.loads(match.group(1))
        signal = int(data.get("investment_signal", 3))
        if signal < 1 or signal > 5:
            signal = 3
        raw_stocks = data.get("recommended_stocks") or []
        if not isinstance(raw_stocks, list):
            raw_stocks = []
        stocks = [str(s).strip() for s in raw_stocks if str(s).strip()][:5]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.warning("sector JSON 블록 파싱 실패, fallback 적용: %s", exc)
        signal, stocks = 3, []

    return body, {
        "investment_signal_raw": signal,
        "recommended_stock_names": stocks,
    }
