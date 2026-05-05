# Session 28: 섹터별 투자 시그널 + 추천 종목 — 백엔드/AI 파이프라인

> **세션 목표**: 섹터 분석 LLM이 본문과 함께 `investment_signal(1~5)` + `recommended_stocks(이름 배열)` 을 JSON으로 산출하도록 강제하고, MarketCompany 마스터에 매칭된 종목만 신뢰 종목으로 영속화한다. UI는 다음 세션에서 처리하므로 이번 세션은 데이터 파이프라인 + 마스터 시드 + 시그널 보정 hook stub 까지가 범위.
> **예상 소요**: 5 ~ 6시간
> **브랜치**: `feat/news-signal-stocks` (dev에서 분기)
> **선행 세션**: Session 27 (뉴스 분석 노드별 SSE 스트리밍) 완료
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
# 디자인 결과물 + 현재 화면
Read /Users/2nan/Documents/Project/2026_oreneo/canvas/news_briefing.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/NewsBriefingDetail.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/StreamingSectorCard.tsx

# 백엔드 (모델·시리얼라이저·뷰·태스크)
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/models.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/serializers.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/views.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/tasks.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/urls.py

# AI 서비스 (그래프·라우터·스트림)
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_graph.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_stream.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/routers/news.py

# 프론트 타입
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/types.ts
```

---

## 배경 (현 상태)

세션 27에서 LangGraph SSE 스트리밍이 완성됐고, Canvas 디자인은 다음을 추가로 요구한다:

- **섹터별 투자 시그널 1~5단계** (적극 매도 ~ 적극 매수)
- **섹터별 추천 종목 칩** (이름 배열)
- **종합 요약 카드 안에 "섹터별 시그널 + 종목" 그리드**

현재 한계:
- LLM 출력은 자유 형식 마크다운(`## Summary / ## Key Signals / ## Risk Factors`)만 강제 — 시그널/종목은 추출 불가
- `MarketCompany.objects.count() == 0` (마스터 비어 있음)
- `MarketSector` 는 KR 6개만 — Canvas 가 요구하는 KR 7개 (자동차·제약/바이오 추가) / US 6개 부재
- `NewsSectorAnalysis` 모델에 시그널/종목 필드 없음

이번 세션은 **백엔드 + AI 파이프라인**만 다룬다 (UI는 session 30).

---

## 사용자 결정사항 (확정)

| 항목 | 결정 |
|---|---|
| `investment_signal` 출처 | **하이브리드** — LLM 1차 시그널 + 외부 metric 보정 (이번 세션은 stub 만, 실제 metric은 후속) |
| `recommended_stocks` 소스 | **LLM 추출 + MarketCompany 마스터 매칭 검증** |

**하이브리드 시그널의 단계적 구현**:
- 이번 세션에서는 `investment_signal_raw` (LLM 원본) 를 영속화
- `investment_signal` (최종) = `apply_metric_adjustment(raw, sector, market)` — 보정 hook 함수만 stub 으로 두고 현재는 그대로 반환
- 실제 metric (감정 분석, 매수 흐름, DART 공시 등) 은 별도 세션에서 정책 결정 후 통합

---

## 꼭지 1: 마스터 데이터 시드 (선결 인프라)

### 배경

`MarketCompany` 가 비어 있으면 stock_matcher 가 모든 종목을 걸러 `recommended_stocks=[]` 이 된다. Canvas 디자인을 검증하려면 KR/US 모두 시드 데이터가 필요. 또한 ai_service `news_graph.py` 의 SECTOR_KEYWORDS 도 새 섹터에 맞춰 확장해야 multi_search_node 가 의미 있는 검색 쿼리를 만든다.

### 작업 A — Management Command `seed_market_data`

`backend/apps/news/management/commands/seed_market_data.py` (신규):

```python
# backend/apps/news/management/commands/seed_market_data.py
"""뉴스 도메인 마스터 데이터 시드 — MarketSector + MarketCompany."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.news.models import MarketCompany, MarketSector

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

# {(sector_code): [(ticker, name_ko, name_en, exchange), ...]}
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


class Command(BaseCommand):
    help = "뉴스 도메인 마스터 데이터 시드 (MarketSector + MarketCompany)."

    @transaction.atomic
    def handle(self, *args, **options):
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
        self.stdout.write(self.style.SUCCESS(f"섹터 시드 완료: {len(sector_map)}건"))

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
        self.stdout.write(self.style.SUCCESS(f"종목 시드 완료: {company_count}건"))
```

기존 KR 섹터들 중 `KR` market 이 아닌 ALL 으로 들어가 있는 row 가 있다면 (ai/원자재/에너지/금융이 ALL 이었음) 충돌이 발생할 수 있다. 사전 정리:

```bash
docker compose exec -T backend python manage.py shell -c "
from apps.news.models import MarketSector
MarketSector.objects.filter(sector_code__in=['AI','RAW_MATERIALS','ENERGY','FINANCE']).delete()
"
```

위 정리 명령은 시드 첫 실행 직전에 한 번만 수행하고, 결과를 사용자에게 알린다.

### 작업 B — ai_service SECTOR_KEYWORDS 확장

`ai_service/services/news_graph.py`:

```python
KR_SECTOR_KEYWORDS: dict[str, str] = {
    "반도체":     "반도체 DRAM 낸드 삼성전자 SK하이닉스",
    "AI":         "AI 인공지능 네이버 카카오 LG AI연구원",
    "자동차":     "자동차 현대차 기아 하이브리드 전기차",
    "조선":       "조선 해운 현대중공업 삼성중공업 한화오션 LNG",
    "제약/바이오": "제약 바이오 셀트리온 삼성바이오로직스 신약",
    "에너지":     "에너지 한국전력 SK에너지 발전 원전 SMR",
    "금융":       "금융 은행 KB 신한 하나 증시 밸류업",
}
US_SECTOR_KEYWORDS: dict[str, str] = {
    "빅테크":     "big tech Apple Microsoft Alphabet Meta",
    "AI/반도체":  "semiconductor chip TSMC NVIDIA AMD AI",
    "전기차":     "EV electric vehicle Tesla Rivian Lucid BYD",
    "헬스케어":   "healthcare biotech Eli Lilly Novo Nordisk GLP-1",
    "에너지":     "energy oil gas Exxon Chevron utility",
    "금융":       "finance banking JPMorgan Goldman Fed",
}
```

### 작업 C — README 또는 docker-compose 후크

dev 환경 부팅 시 자동 시드는 하지 않는다 (사용자가 수동 1회 실행). 이번 세션 종료 시 검증을 위해 직접 실행하고 결과를 README/문서에 남길 필요 없음.

### 검증

```bash
docker compose exec -T backend python manage.py seed_market_data
docker compose exec -T backend python manage.py shell -c "
from apps.news.models import MarketSector, MarketCompany
print('Sector:', MarketSector.objects.count())
print('Company:', MarketCompany.objects.count())
print('KR sectors:', list(MarketSector.objects.filter(market='KR').values_list('sector_name_ko', flat=True)))
print('US sectors:', list(MarketSector.objects.filter(market='US').values_list('sector_name_ko', flat=True)))
"
```

### 완료 기준
- [ ] `seed_market_data` 명령이 idempotent (반복 실행 시 데이터 중복 없음, update_or_create)
- [ ] MarketSector — KR 7건, US 6건
- [ ] MarketCompany — 39건 이상
- [ ] `news_graph.py` SECTOR_KEYWORDS 가 새 섹터를 모두 포함

### 커밋
```
chore(news): 마스터 데이터 시드 + 새 섹터(KR 자동차·바이오, US 6섹터) 추가
```

---

## 꼭지 2: NewsSectorAnalysis 모델 확장 + 마이그레이션

### 작업

`backend/apps/news/models.py` 의 `NewsSectorAnalysis`:

```python
class NewsSectorAnalysis(models.Model):
    """TBL_NEWS_SECTOR_ANALYSIS — 섹터별 분석 결과."""

    SIGNAL_CHOICES = [
        (1, "1 - 적극 매도"),
        (2, "2 - 비중 축소"),
        (3, "3 - 중립"),
        (4, "4 - 비중 확대"),
        (5, "5 - 적극 매수"),
    ]

    analysis = models.ForeignKey(
        NewsAnalysis, on_delete=models.CASCADE, related_name="sector_analyses"
    )
    sector = models.ForeignKey(MarketSector, on_delete=models.PROTECT)
    analysis_text = models.TextField(blank=True)
    article_count = models.IntegerField(default=0)

    investment_signal_raw = models.PositiveSmallIntegerField(
        default=3, choices=SIGNAL_CHOICES,
        help_text="LLM 원본 시그널 (보정 전)"
    )
    investment_signal = models.PositiveSmallIntegerField(
        default=3, choices=SIGNAL_CHOICES,
        help_text="metric 보정 후 최종 시그널"
    )
    recommended_stocks = models.JSONField(
        default=list,
        help_text="[{'ticker': '005930', 'name': '삼성전자'}, ...] 마스터 매칭된 종목만 저장"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "TBL_NEWS_SECTOR_ANALYSIS"
        unique_together = [("analysis", "sector")]
```

마이그레이션:
```bash
docker compose exec -T backend python manage.py makemigrations news
docker compose exec -T backend python manage.py migrate
```

### 검증

```bash
docker compose exec -T backend python manage.py shell -c "
from apps.news.models import NewsSectorAnalysis
nsa = NewsSectorAnalysis._meta.get_fields()
print([f.name for f in nsa if hasattr(f, 'name')])
"
```

`investment_signal_raw`, `investment_signal`, `recommended_stocks` 가 출력에 포함되어야 한다.

### 완료 기준
- [ ] 마이그레이션 파일 생성 및 적용
- [ ] 기존 row 들에 default 적용 (raw=3, signal=3, stocks=[])
- [ ] admin.py 의 list_display 에 새 필드 추가 (선택)

### 커밋
```
feat(news): NewsSectorAnalysis 에 investment_signal + recommended_stocks 추가
```

---

## 꼭지 3: AI 프롬프트 확장 + sector_analyze_node JSON 파싱

### 배경

LLM 출력 마지막에 강제 JSON 블록을 두고, 분석 텍스트와 시그널/종목을 분리해 state 에 누적한다.

### 작업 A — `SECTOR_ANALYZE_SYSTEM` 프롬프트 수정

`ai_service/services/news_graph.py`:

```python
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
   - recommended_stocks: 본문에서 언급된 상장 종목명만 인용. 한국 시장이면
     한글 정식명(예: "삼성전자"), 미국 시장이면 한글 또는 영문 회사명. 최대 5개.
     기사가 0건이면 빈 배열.

5. JSON 블록 외 추가 코드펜스는 금지. 마지막 줄은 빈 줄 없이 끝낸다.
6. 기사가 0건이면 세 섹션 모두 "수집된 기사가 없어 분석을 생성할 수 없습니다." 로 채우고, JSON 은 `{"investment_signal": 3, "recommended_stocks": []}` 로 한다.
"""
```

### 작업 B — JSON 블록 파서 유틸

`ai_service/services/news_graph.py` 또는 `ai_service/services/sector_parser.py` (신규):

```python
import json
import re
from typing import TypedDict

_JSON_FENCE_RE = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL)


class SectorMeta(TypedDict):
    investment_signal_raw: int
    recommended_stock_names: list[str]


def split_sector_response(content: str) -> tuple[str, SectorMeta]:
    """LLM 응답을 분석 텍스트 + 메타로 분리한다.

    Args:
        content: LLM 원본 응답 (마크다운 + ```json 블록).

    Returns:
        (analysis_text, meta) — analysis_text 는 JSON 블록을 제거한 본문,
        meta 는 {investment_signal_raw, recommended_stock_names} dict.

    Notes:
        파싱 실패 시 fallback 으로 signal=3, stocks=[] 반환. 본문은 JSON
        블록 패턴이 발견되지 않으면 원본 그대로 반환.
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
        stocks = data.get("recommended_stocks", []) or []
        if not isinstance(stocks, list):
            stocks = []
        # 문자열만, 최대 5개
        stocks = [str(s).strip() for s in stocks if str(s).strip()][:5]
    except (json.JSONDecodeError, TypeError, ValueError):
        signal, stocks = 3, []

    return body, {
        "investment_signal_raw": signal,
        "recommended_stock_names": stocks,
    }
```

### 작업 C — `sector_analyze_node` 수정

`ai_service/services/news_graph.py`:

```python
class AgentState(TypedDict):
    # ... 기존 필드 ...
    sector_signals: dict[str, int]            # 신규 — sector → 1~5
    sector_stocks: dict[str, list[str]]       # 신규 — sector → 종목명 배열
    timings: dict[str, Any]


def _make_sector_analyze_node(streaming: bool):
    async def sector_analyze_node(state: AgentState) -> dict:
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
```

`build_news_graph` 의 initial state 와 routers/news.py `_initial_state` 에도 `sector_signals: {}`, `sector_stocks: {}` 초기화 추가.

### 검증

ai_service 컨테이너에서 짧은 분석을 직접 호출:

```bash
docker compose exec -T ai_service python -c "
import asyncio, httpx, json
async def main():
    async with httpx.AsyncClient(timeout=600) as c:
        r = await c.post(
            'http://localhost:8001/news/analyze',
            json={'target_date':'2026-05-04','market':'KR','sectors':['반도체']},
        )
        d = r.json()
        print('keys:', sorted(d.keys()))
        print('sector_analyses[반도체] tail:', d['sector_analyses']['반도체'][-200:])
        print('sector_signals:', d.get('sector_signals'))
        print('sector_stocks:', d.get('sector_stocks'))
asyncio.run(main())
"
```

응답에 `sector_signals = {"반도체": 4}` 등의 정수, `sector_stocks = {"반도체": ["삼성전자", ...]}` 등의 배열이 들어가야 한다. 분석 텍스트 끝의 ```json 블록은 제거되어야 한다.

### 완료 기준
- [ ] `SECTOR_ANALYZE_SYSTEM` 에 JSON 출력 강제 규칙 추가
- [ ] `split_sector_response()` 가 정상/fallback 양쪽 모두 처리
- [ ] `sector_analyze_node` 가 state 에 `sector_signals`, `sector_stocks` 누적
- [ ] LLM이 종목명을 자유 형식으로 출력해도 (한글/영문 혼재) 그대로 수용

### 커밋
```
feat(news): sector_analyze 에 JSON 출력 강제 + 시그널/종목 추출 파서
```

---

## 꼭지 4: AI 응답 스키마 + SSE 페이로드 확장

### 작업

`ai_service/routers/news.py`:

```python
class NewsAnalyzeResponse(BaseModel):
    overall_analysis: str
    sector_analyses: dict[str, str]
    sector_article_counts: dict[str, int]
    sector_articles_meta: dict[str, list[dict]] = {}
    sector_signals: dict[str, int] = {}      # 신규
    sector_stocks: dict[str, list[str]] = {} # 신규
    timings: dict[str, Any] = {}
    run_duration_ms: int


# analyze_news() 비스트리밍 — result.get("sector_signals", {}) 그대로 전달
# analyze_news_stream() complete 페이로드에도 동일 추가
```

`ai_service/services/news_stream.py` — `node_done(sector_analyze_node)` 페이로드에 sector_signals, sector_stocks 포함:

```python
def translate_langgraph_event(ev):
    # ... 기존 분기 ...
    if etype == "on_chain_end" and name in NODE_NAMES:
        data = ev.get("data", {}) or {}
        output = data.get("output")
        payload: dict[str, Any] = {"node": name}
        if isinstance(output, dict):
            if "sector_analyses" in output:
                payload["sector_analyses"] = output["sector_analyses"]
            if "sector_signals" in output:                       # 신규
                payload["sector_signals"] = output["sector_signals"]
            if "sector_stocks" in output:                        # 신규
                payload["sector_stocks_raw"] = output["sector_stocks"]  # 매칭 전 이름 배열
            if "overall_analysis" in output:
                payload["full_text"] = output["overall_analysis"]
            if "sector_article_counts" in output:
                payload["sector_article_counts"] = output["sector_article_counts"]
        return sse("node_done", payload)
    # ... 나머지 분기 동일 ...
```

> 주의: SSE 단계의 `sector_stocks_raw` 는 LLM이 자유 추출한 이름 배열이고, 마스터 매칭은 Django proxy 가 `complete` 시점에 수행. UI는 `complete` 후 DB 재조회 결과를 사용하므로 `sector_stocks_raw` 는 즉시 표시용으로만 활용 (선택).

### 검증

호스트에서 SSE 직격:
```bash
docker exec orneo_ai_service python -c "
import asyncio, httpx, json
async def main():
    async with httpx.AsyncClient(timeout=600) as c:
        async with c.stream('POST','http://localhost:8001/news/analyze/stream',
            json={'target_date':'2026-05-04','market':'KR','sectors':['반도체']}) as r:
            ev=None; buf=[]; complete=None
            async for line in r.aiter_lines():
                if line.startswith('event: '): ev=line[7:].strip(); buf=[]
                elif line.startswith('data: '): buf.append(line[6:])
                elif line=='':
                    if ev=='complete' and buf: complete=json.loads('\n'.join(buf))
                    ev=None; buf=[]
            print(json.dumps({'sector_signals':complete['sector_signals'],
                              'sector_stocks':complete['sector_stocks']}, ensure_ascii=False))
asyncio.run(main())
"
```

### 완료 기준
- [ ] 비스트리밍 `/news/analyze` 응답에 sector_signals/sector_stocks 포함
- [ ] SSE `complete` 페이로드에 sector_signals/sector_stocks 포함
- [ ] SSE `node_done(sector_analyze_node)` 에도 동일 정보 (UI 즉시 갱신용)

### 커밋
```
feat(news): SSE/HTTP 응답에 sector_signals + sector_stocks 추가
```

---

## 꼭지 5: MarketCompany 매칭 + 시그널 보정 헬퍼

### 작업 A — Stock matcher

`backend/apps/news/services/__init__.py` (빈 파일)
`backend/apps/news/services/stock_matcher.py` (신규):

```python
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


def match_stocks(names: list[str], market: str, *, limit: int = 5) -> list[MatchedStock]:
    """LLM이 제시한 종목명 후보를 MarketCompany 마스터와 매칭한다.

    Args:
        names: LLM이 자유 형식으로 추출한 종목명/티커 후보.
        market: "KR" | "US".
        limit: 반환할 최대 종목 수.

    Returns:
        매칭된 종목의 [{ticker, name}] 배열. 마스터에 없는 이름은 제외.
        한글명/영문명/티커 모두 매칭 시도.
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

    seen: set[str] = set()
    out: list[MatchedStock] = []
    # 입력 순서를 보존하기 위해 lookup map 구성
    by_ko = {c.company_name_ko: c for c in qs if c.company_name_ko}
    by_en = {c.company_name_en: c for c in qs}
    by_ticker = {c.ticker: c for c in qs}

    for n in cleaned:
        c = by_ko.get(n) or by_en.get(n) or by_ticker.get(n)
        if c and c.ticker not in seen:
            seen.add(c.ticker)
            display = c.company_name_ko or c.company_name_en
            out.append({"ticker": c.ticker, "name": display})
            if len(out) >= limit:
                break

    if len(cleaned) > 0 and len(out) == 0:
        logger.info(
            "stock_matcher: 매칭 0건 — market=%s candidates=%s",
            market, cleaned,
        )
    return out
```

### 작업 B — Signal adjustor stub

`backend/apps/news/services/signal_adjustor.py` (신규):

```python
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
        market: "KR" | "US".

    Returns:
        보정된 시그널 (1~5). 현재는 raw 와 동일.
    """
    # TODO(session-32+): metric 통합 정책 합의 후 가중 합산 로직 도입
    if raw < 1:
        return 1
    if raw > 5:
        return 5
    return raw
```

### 작업 C — Django proxy `_persist_complete_payload` 수정

`backend/apps/news/views.py` 의 `_persist_complete_payload` 가 NewsSectorAnalysis 생성 시 두 헬퍼를 호출:

```python
from apps.news.services.stock_matcher import match_stocks
from apps.news.services.signal_adjustor import apply_metric_adjustment


@sync_to_async(thread_sensitive=True)
def _persist_complete_payload(target_date: str, market: str, payload: dict) -> None:
    sector_analyses = payload.get("sector_analyses") or {}
    counts = payload.get("sector_article_counts") or {}
    signals = payload.get("sector_signals") or {}
    stocks_raw = payload.get("sector_stocks") or {}

    analysis_obj, _ = NewsAnalysis.objects.update_or_create(
        analysis_date=target_date,
        market=market,
        engine_type="langgraph",
        defaults={
            "run_status": "COMPLETED",
            "overall_analysis": payload.get("overall_analysis", ""),
            "raw_result": {
                "sector_analyses": sector_analyses,
                "sector_article_counts": counts,
                "sector_articles_meta": payload.get("sector_articles_meta", {}),
                "sector_signals": signals,
                "sector_stocks": stocks_raw,
                "timings": payload.get("timings", {}),
            },
            "run_duration_ms": payload.get("run_duration_ms"),
            "error_message": "",
        },
    )

    if not sector_analyses:
        return

    sector_map = {
        s.sector_name_ko: s
        for s in MarketSector.objects.filter(
            sector_name_ko__in=sector_analyses.keys(),
            market__in=[market, "ALL"],
        )
    }
    for sector_name, analysis_text in sector_analyses.items():
        sector_obj = sector_map.get(sector_name)
        if not sector_obj:
            continue
        raw_signal = int(signals.get(sector_name, 3))
        final_signal = apply_metric_adjustment(raw_signal, sector_name, market)
        matched = match_stocks(stocks_raw.get(sector_name, []), market)
        NewsSectorAnalysis.objects.update_or_create(
            analysis=analysis_obj,
            sector=sector_obj,
            defaults={
                "analysis_text": analysis_text,
                "article_count": counts.get(sector_name, 0),
                "investment_signal_raw": raw_signal,
                "investment_signal": final_signal,
                "recommended_stocks": matched,
            },
        )
```

`backend/apps/news/tasks.py` 의 `run_daily_news_analysis` 도 동일하게 NewsSectorAnalysis 생성 부분에 헬퍼 적용 (Celery 경로 유지).

### 검증

```bash
# 비스트리밍 1회 강제 실행
docker compose exec -T backend python manage.py shell -c "
from apps.news.tasks import run_daily_news_analysis
run_daily_news_analysis.delay(target_date='2026-05-04', market='KR')
"

# 잠시 후
docker compose exec -T backend python manage.py shell -c "
from apps.news.models import NewsAnalysis, NewsSectorAnalysis
a = NewsAnalysis.objects.filter(market='KR').order_by('-updated_at').first()
print('analysis:', a.analysis_date, a.run_status)
for nsa in a.sector_analyses.select_related('sector').all():
    print(f'  {nsa.sector.sector_name_ko}: signal={nsa.investment_signal} raw={nsa.investment_signal_raw} stocks={nsa.recommended_stocks}')
"
```

### 완료 기준
- [ ] match_stocks 가 한글명/영문명/티커 모두 매칭
- [ ] LLM이 마스터에 없는 종목명을 제시해도 매칭에서 제외만 되고 에러 없음
- [ ] apply_metric_adjustment stub 이 raw 를 그대로 통과
- [ ] DB row 의 investment_signal == apply_metric_adjustment(raw) 결과
- [ ] Celery 데일리 경로 + Django SSE proxy 둘 다 동일하게 적재

### 커밋
```
feat(news): MarketCompany 매칭 헬퍼 + 시그널 보정 stub + DB 적재
```

---

## 꼭지 6: Serializer / 프론트 타입 확장

### 작업 A — `NewsSectorAnalysisSerializer`

`backend/apps/news/serializers.py`:

```python
class NewsSectorAnalysisSerializer(serializers.ModelSerializer):
    sector_name_ko = serializers.CharField(source="sector.sector_name_ko", read_only=True)

    class Meta:
        model = NewsSectorAnalysis
        fields = [
            "id",
            "sector_name_ko",
            "analysis_text",
            "article_count",
            "investment_signal",        # 신규
            "investment_signal_raw",    # 신규
            "recommended_stocks",       # 신규
        ]
```

### 작업 B — 프론트 타입

`frontend/src/lib/types.ts`:

```ts
export type RecommendedStock = {
  ticker: string;
  name: string;
};

export type InvestmentSignal = 1 | 2 | 3 | 4 | 5;

export type NewsSectorAnalysis = {
  id: number;
  sector_name_ko: string;
  analysis_text: string;
  article_count: number;
  investment_signal: InvestmentSignal;
  investment_signal_raw: InvestmentSignal;
  recommended_stocks: RecommendedStock[];
};
```

### 작업 C — UI placeholder (최소)

`frontend/src/components/news/NewsBriefingDetail.tsx` — 섹터 탭 영역의 본문 위에 임시로 `signal: N · 추천: A, B, C` 한 줄 표시 (디자인은 session 30 에서 제대로):

```tsx
{(() => {
  const active = analysis.sector_analyses.find((s) => s.id === activeSectorId);
  if (!active) return null;
  if (active.article_count === 0) {
    return (...);  // 기존
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-[var(--color-text-sub)]">
        signal: {active.investment_signal} · 추천:{" "}
        {active.recommended_stocks.length > 0
          ? active.recommended_stocks.map((s) => s.name).join(", ")
          : "(없음)"}
      </p>
      <SectorMarkdown text={active.analysis_text} />
    </div>
  );
})()}
```

> 이 placeholder 는 session 30 에서 정식 컴포넌트로 교체된다.

### 검증

```bash
TOKEN=$(docker exec orneo_backend python manage.py shell -c "
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import CustomUser
print(str(RefreshToken.for_user(CustomUser.objects.first()).access_token))
" 2>/dev/null | tail -1)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/news/analyses/latest/?market=KR | python3 -m json.tool | head -50
```

응답의 `data.sector_analyses[*]` 에 `investment_signal`, `investment_signal_raw`, `recommended_stocks` 가 포함되어야 한다.

### 완료 기준
- [ ] Serializer 응답에 새 필드
- [ ] 프론트 타입 동기화
- [ ] 컨테이너 type-check 통과 (`docker exec orneo_frontend npx tsc --noEmit`)
- [ ] 브라우저에서 임시 1줄 표시 정상

### 커밋
```
feat(news): NewsSectorAnalysisSerializer + 프론트 타입 확장
```

---

## 꼭지 7 (옵션): admin.py 컬럼 추가

`backend/apps/news/admin.py` 의 `NewsSectorAnalysisAdmin` `list_display` 에 `investment_signal`, `recommended_stocks` 추가. UI 검증/디버깅에 유용.

### 커밋
```
chore(news): admin 에 investment_signal/recommended_stocks 컬럼 노출
```

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/news-signal-stocks

gh pr create --base dev \
  --title "[feat] 섹터별 투자 시그널 + 추천 종목 산출" \
  --body "..."

gh pr merge <N> --merge --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/news-signal-stocks" \
  --body "..."

git checkout dev && git pull origin dev
git branch -d feat/news-signal-stocks
mv prompts/session_28_news_signal_stocks_backend.md prompts/_complete/
```

---

## 규칙 재확인

이 세션 진행 중 다음 규칙을 항상 적용 (자동 로드된 `.claude/rules/*.md` 가 후반에 희석되지 않도록):

- **API 응답 표준** — `project_conventions.md` 의 `{status:"success", data}` / `{status:"error", code, message}`
- **Google-style docstring + type hints (`from __future__ import annotations`)** — `clean_code.md`
- **로깅 패턴** — `logger.<level>("msg %s", arg)` 형식, `print()` 금지, PII 로그 금지 — `logging.md`
- **커밋 + PR** — Conventional Commits, `gh pr create --base dev`, Merge Commit (`--no-ff`) — `git_workflow.md`
- **Django 계층 분리** — View / Service / Selector / Model, View 에서 DB 직접 접근 금지, 비즈니스 예외는 `exceptions.py` 위임 — `django.md`
- **FastAPI 보안** — 모든 라우터 `X-Service-Secret` 검증 (이미 미들웨어 처리), PII 미수신 — `fastapi.md`
- **Docker** — 직접 `docker compose` 대신 `./dc.sh dev <cmd>`, `version:` 선언 금지 — `docker.md`

---

## 메모: 차후 신경 쓸 점

- **하이브리드 metric 정의 별도 세션** — apply_metric_adjustment 가 stub 이므로, "외부 metric을 무엇으로 잡을지" 정책 결정 필요 (감정 분석, 매수/매도 흐름, DART 공시 등)
- **LLM이 영문 회사명을 제시할 때** — 한국 시장 분석에서 "Samsung Electronics" 라고 나오면 KR_FINANCE 의 한글명만 가진 row 와 매칭 실패 가능. match_stocks 가 KR/US 매칭 모두 시도하는지 재확인
- **JSON 블록 파싱 실패율 모니터링** — Gemma 가 ```json 펜스를 빠뜨릴 가능성. 실제 운영에서 fallback (signal=3, stocks=[]) 비율이 높으면 프롬프트를 정교하게 다듬어야 함
- **관련 후속 세션**: session 29 (양시장), session 30 (UI 적용), session 31 (검색 진행 표시)
