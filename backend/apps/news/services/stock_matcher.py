# backend/apps/news/services/stock_matcher.py
"""LLM 추출 종목명을 MarketCompany 마스터에 매칭한다."""

from __future__ import annotations

import logging
from typing import TypedDict

from django.db.models import Q

from apps.news.models import MarketCompany

logger = logging.getLogger(__name__)


class MatchedStock(TypedDict):
    ticker: str
    name: str


def match_stocks(
    names: list[str], market: str, *, limit: int = 5
) -> list[MatchedStock]:
    """LLM 이 제시한 종목명 후보를 MarketCompany 마스터와 매칭한다.

    Args:
        names: LLM 이 자유 형식으로 추출한 종목명/티커 후보.
        market: ``"KR"`` 또는 ``"US"``.
        limit: 반환할 최대 종목 수.

    Returns:
        매칭된 종목의 ``[{ticker, name}]`` 배열. 마스터에 없는 이름은 제외하며
        한글명·영문명·티커 어느 것이든 매칭한다. 입력 순서를 보존한다.
    """
    if not names:
        return []
    cleaned = [n.strip() for n in names if n and n.strip()]
    if not cleaned:
        return []

    qs = MarketCompany.objects.filter(market=market, is_active=True).filter(
        Q(company_name_ko__in=cleaned)
        | Q(company_name_en__in=cleaned)
        | Q(ticker__in=cleaned)
    )

    by_ko = {c.company_name_ko: c for c in qs if c.company_name_ko}
    by_en = {c.company_name_en: c for c in qs if c.company_name_en}
    by_ticker = {c.ticker: c for c in qs}

    seen: set[str] = set()
    out: list[MatchedStock] = []
    for n in cleaned:
        c = by_ko.get(n) or by_en.get(n) or by_ticker.get(n)
        if c and c.ticker not in seen:
            seen.add(c.ticker)
            display = c.company_name_ko or c.company_name_en
            out.append({"ticker": c.ticker, "name": display})
            if len(out) >= limit:
                break

    if cleaned and not out:
        logger.info(
            "stock_matcher: 매칭 0건 — market=%s candidates=%s",
            market,
            cleaned,
        )
    return out
