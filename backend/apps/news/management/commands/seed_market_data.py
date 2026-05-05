# backend/apps/news/management/commands/seed_market_data.py
"""뉴스 도메인 마스터 데이터 시드 — MarketSector + MarketCompany."""

from __future__ import annotations

import logging

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.news.models import MarketCompany, MarketSector, NewsSectorAnalysis

logger = logging.getLogger(__name__)

# (sector_code, sector_name_ko, sector_name_en, market, display_order)
SECTORS: list[tuple[str, str, str, str, int]] = [
    # KR — 7개
    ("KR_SEMICONDUCTOR", "반도체", "Semiconductor", "KR", 1),
    ("KR_AI", "AI", "AI", "KR", 2),
    ("KR_AUTO", "자동차", "Automotive", "KR", 3),
    ("KR_SHIPBUILDING", "조선", "Shipbuilding", "KR", 4),
    ("KR_BIO", "제약/바이오", "Pharma/Bio", "KR", 5),
    ("KR_ENERGY", "에너지", "Energy", "KR", 6),
    ("KR_FINANCE", "금융", "Finance", "KR", 7),
    # US — 6개
    ("US_BIGTECH", "빅테크", "Big Tech", "US", 11),
    ("US_AI_SEMI", "AI/반도체", "AI/Semiconductor", "US", 12),
    ("US_EV", "전기차", "EV", "US", 13),
    ("US_HEALTHCARE", "헬스케어", "Healthcare", "US", 14),
    ("US_ENERGY", "에너지", "Energy", "US", 15),
    ("US_FINANCE", "금융", "Finance", "US", 16),
]

# {sector_code: [(ticker, name_ko, name_en, exchange), ...]}
COMPANIES: dict[str, list[tuple[str, str, str, str]]] = {
    "KR_SEMICONDUCTOR": [
        ("005930", "삼성전자", "Samsung Electronics", "KOSPI"),
        ("000660", "SK하이닉스", "SK Hynix", "KOSPI"),
        ("042700", "한미반도체", "Hanmi Semiconductor", "KOSPI"),
    ],
    "KR_AI": [
        ("035420", "네이버", "NAVER", "KOSPI"),
        ("035720", "카카오", "Kakao", "KOSPI"),
        ("389030", "크라우드웍스", "Crowdworks", "KOSDAQ"),
    ],
    "KR_AUTO": [
        ("005380", "현대차", "Hyundai Motor", "KOSPI"),
        ("000270", "기아", "Kia", "KOSPI"),
        ("012330", "현대모비스", "Hyundai Mobis", "KOSPI"),
    ],
    "KR_SHIPBUILDING": [
        ("009540", "HD한국조선해양", "HD Korea Shipbuilding", "KOSPI"),
        ("042660", "한화오션", "Hanwha Ocean", "KOSPI"),
        ("010140", "삼성중공업", "Samsung Heavy Industries", "KOSPI"),
    ],
    "KR_BIO": [
        ("068270", "셀트리온", "Celltrion", "KOSPI"),
        ("207940", "삼성바이오로직스", "Samsung Biologics", "KOSPI"),
        ("000100", "유한양행", "Yuhan", "KOSPI"),
    ],
    "KR_ENERGY": [
        ("267260", "HD현대일렉트릭", "HD Hyundai Electric", "KOSPI"),
        ("034020", "두산에너빌리티", "Doosan Enerbility", "KOSPI"),
        ("010120", "LS ELECTRIC", "LS Electric", "KOSPI"),
    ],
    "KR_FINANCE": [
        ("105560", "KB금융", "KB Financial", "KOSPI"),
        ("086790", "하나금융지주", "Hana Financial", "KOSPI"),
        ("138040", "메리츠금융지주", "Meritz Financial", "KOSPI"),
    ],
    "US_BIGTECH": [
        ("AAPL", "애플", "Apple", "NASDAQ"),
        ("MSFT", "마이크로소프트", "Microsoft", "NASDAQ"),
        ("GOOGL", "알파벳", "Alphabet", "NASDAQ"),
    ],
    "US_AI_SEMI": [
        ("NVDA", "엔비디아", "NVIDIA", "NASDAQ"),
        ("AMD", "AMD", "AMD", "NASDAQ"),
        ("AVGO", "브로드컴", "Broadcom", "NASDAQ"),
    ],
    "US_EV": [
        ("TSLA", "테슬라", "Tesla", "NASDAQ"),
        ("RIVN", "리비안", "Rivian", "NASDAQ"),
        ("LCID", "루시드", "Lucid", "NASDAQ"),
    ],
    "US_HEALTHCARE": [
        ("LLY", "일라이 릴리", "Eli Lilly", "NYSE"),
        ("NVO", "노보 노디스크", "Novo Nordisk", "NYSE"),
        ("MRK", "머크", "Merck", "NYSE"),
    ],
    "US_ENERGY": [
        ("XOM", "엑슨모빌", "ExxonMobil", "NYSE"),
        ("CVX", "셰브론", "Chevron", "NYSE"),
        ("NEE", "넥스트에라 에너지", "NextEra Energy", "NYSE"),
    ],
    "US_FINANCE": [
        ("JPM", "JP모건", "JPMorgan Chase", "NYSE"),
        ("BAC", "뱅크오브아메리카", "Bank of America", "NYSE"),
        ("GS", "골드만삭스", "Goldman Sachs", "NYSE"),
    ],
}

# 0002 seed migration이 만든 ALL/legacy 코드 — 새 KR_*/US_* 와 충돌하므로 정리.
LEGACY_SECTOR_CODES: list[str] = [
    "AI",
    "RAW_MATERIALS",
    "ENERGY",
    "FINANCE",
    "SEMICONDUCTOR",
    "SHIPBUILDING",
]


class Command(BaseCommand):
    help = "뉴스 도메인 마스터 데이터 시드 (MarketSector + MarketCompany)."

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        """레거시 섹터를 정리하고 새 섹터·종목을 idempotent 하게 시드한다."""
        legacy_qs = MarketSector.objects.filter(sector_code__in=LEGACY_SECTOR_CODES)
        legacy_count = legacy_qs.count()
        if legacy_count:
            # PROTECT FK 가 걸린 NewsSectorAnalysis 부터 정리. 원본은 NewsAnalysis.raw_result JSON 에 보존된다.
            dep_count, _ = NewsSectorAnalysis.objects.filter(sector__in=legacy_qs).delete()
            legacy_qs.delete()
            self.stdout.write(
                self.style.WARNING(
                    f"레거시 섹터 정리: 섹터 {legacy_count}건 + 종속 분석 {dep_count}건 삭제"
                )
            )

        sector_map: dict[str, MarketSector] = {}
        for code, ko, en, market, order in SECTORS:
            obj, _ = MarketSector.objects.update_or_create(
                sector_code=code,
                defaults={
                    "sector_name_ko": ko,
                    "sector_name_en": en,
                    "market": market,
                    "display_order": order,
                    "is_active": True,
                },
            )
            sector_map[code] = obj
        self.stdout.write(
            self.style.SUCCESS(f"섹터 시드 완료: {len(sector_map)}건")
        )

        company_count = 0
        for sector_code, rows in COMPANIES.items():
            sector = sector_map[sector_code]
            market = sector.market
            for ticker, ko, en, exchange in rows:
                MarketCompany.objects.update_or_create(
                    ticker=ticker,
                    defaults={
                        "company_name_ko": ko,
                        "company_name_en": en,
                        "market": market,
                        "exchange": exchange,
                        "sector": sector,
                        "is_active": True,
                    },
                )
                company_count += 1
        self.stdout.write(
            self.style.SUCCESS(f"종목 시드 완료: {company_count}건")
        )
