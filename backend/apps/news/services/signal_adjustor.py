# backend/apps/news/services/signal_adjustor.py
"""LLM 1차 시그널을 외부 metric 으로 보정하는 hook (현재는 stub)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def apply_metric_adjustment(raw: int, sector: str, market: str) -> int:
    """investment_signal_raw 에 외부 metric 을 합산해 최종 신호를 반환한다.

    현재 구현은 raw 를 그대로 통과시키는 stub. 향후 다음 metric 을 가중 합산:

        - 섹터별 종목 매수 흐름 (외부 데이터)
        - DART 공시 양/감정 (이미 통합된 dart 클라이언트 활용)
        - Tavily 검색 결과의 감정 스코어 (별도 노드)

    Args:
        raw: LLM 원본 시그널 (1~5).
        sector: 섹터명 (한글). 후속 metric 매핑 키.
        market: ``"KR"`` 또는 ``"US"``.

    Returns:
        보정된 시그널 (1~5). 현재는 raw 와 동일하게 클램프만 적용.
    """
    # TODO(session-32+): metric 통합 정책 합의 후 가중 합산 로직 도입
    if raw < 1:
        return 1
    if raw > 5:
        return 5
    return raw
