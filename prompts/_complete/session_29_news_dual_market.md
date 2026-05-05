# Session 29: KR + US 양시장 병렬 분석 + FullAnalysis 응답 구조

> **세션 목표**: 단일 API 1회 호출(`market=ALL`)로 ai_service 가 KR / US 두 LangGraph 를 `asyncio.gather` 로 병렬 실행하고, SSE 이벤트에 시장 식별자가 포함되어 흐른다. complete 시점에 두 NewsAnalysis row 를 영속화하고, 프론트는 `FullAnalysis { markets: { KR, US } }` 구조로 받아 토글에 따라 화면을 분기한다. UI 디자인은 다음 세션에서 처리하므로 이번 세션은 임시 토글만 노출.
> **예상 소요**: 5 ~ 6시간
> **브랜치**: `feat/news-dual-market` (dev에서 분기)
> **선행 세션**: Session 28 (시그널/종목 백엔드) 완료
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
# 디자인 결과물
Read /Users/2nan/Documents/Project/2026_oreneo/canvas/news_briefing.tsx

# AI 서비스 (그래프·라우터·스트림)
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_graph.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_stream.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/routers/news.py

# 백엔드 (뷰·태스크·시리얼라이저·URL·모델)
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/views.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/urls.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/tasks.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/serializers.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/models.py

# 프론트 (다시 생성 + 프록시 + 라우트)
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/NewsBriefingDetail.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/types.ts
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/sse.ts
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/app/(app)/news/page.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/app/(app)/news/[date]/page.tsx
```

---

## 배경 (현 상태)

세션 28을 통해 NewsSectorAnalysis 가 `investment_signal`, `recommended_stocks` 까지 보유한다. 단, 한 분석 = 한 시장 (현재는 KR 만 사용) 구조다. Canvas 디자인은 KR + US 를 한 화면에서 토글로 비교하는 UI 를 요구한다.

현재 한계:
- `analyze_news_stream` 은 `req.market` 1개만 받아 그래프 1회 실행
- "다시 생성" 버튼은 `{ market: "KR", target_date }` 만 보냄
- `NewsAnalysisLatestView` / `NewsAnalysisByDateView` 도 단일 시장 row 만 반환
- 데일리 Celery `run_daily_news_analysis` 도 호출당 시장 1개

이번 세션은 **단일 호출로 KR/US 양쪽을 함께 처리**하는 backend/AI 라인을 만든다.

---

## 사용자 결정사항 (확정)

| 항목 | 결정 |
|---|---|
| 양시장 분석 아키텍처 | 단일 API 1회 호출 + ai_service 내부 그래프 병렬 (`asyncio.gather`) |

따라서 SSE 이벤트는 KR/US 가 **interleaved 로 흘러내린다** (반도체 token, 빅테크 token 이 시간 순서대로 섞임). 프론트는 `market` 식별자로 분기해 시장별 누적.

---

## SSE 이벤트 프로토콜 (이번 세션의 변경)

기존 이벤트 그대로 유지하되, **모든 페이로드에 `market` 필드 추가**.

| event | data 변경 |
|-------|-----------|
| `graph_start` | `{target_date, market: "ALL", markets: ["KR","US"], sectors_by_market: {KR: [...], US: [...]}}` |
| `node_start` | `{node, market}` (e.g. `{node:"sector_analyze_node", market:"KR"}`) |
| `node_done` | `{node, market, sector_analyses?, sector_signals?, sector_stocks_raw?, full_text?, sector_article_counts?}` |
| `token` | `{scope, market, sector?, text}` |
| `complete` | `{markets: {KR: {...}, US: {...}}, run_duration_ms, analysis_date, target_date}` |
| `error` | `{message, market?}` |

호환성: `market="KR"` 또는 `"US"` 단일 호출 시 기존 평면 구조를 유지한다 (graph_start 의 markets 키 생략, complete 평면화).

---

## 꼭지 1: 프론트 타입 정의

### 작업

`frontend/src/lib/types.ts`:

```ts
export type MarketCode = "KR" | "US";

export type MarketAnalysis = {
  /** 단일 시장에 한정한 분석 결과 */
  market: MarketCode;
  overall_analysis: string;
  sector_analyses: NewsSectorAnalysis[];
  run_duration_ms: number | null;
};

export type FullAnalysis = {
  /** market="ALL" 호출 결과. KR/US 두 시장을 함께 표현 */
  analysis_date: string;
  run_duration_ms: number;
  markets: Record<MarketCode, MarketAnalysis>;
};
```

기존 `NewsAnalysis` 는 단일 시장 row 응답용으로 유지 (`/analyses/latest/?market=KR` 등 GET 엔드포인트 호환).

### 완료 기준
- [ ] 새 타입이 export, 컨테이너 type-check 통과

### 커밋
```
chore(news): MarketCode/MarketAnalysis/FullAnalysis 타입 정의
```

---

## 꼭지 2: ai_service `analyze_news_stream` market="ALL" 분기

### 배경

LangGraph `astream_events` 두 개 (KR/US) 의 출력을 SSE 한 채널로 합쳐야 한다. 각 그래프는 독립 task 로 돌고, 이벤트는 발생 순서대로 `asyncio.Queue` 에 enqueue, 메인 코루틴이 순차 dequeue 해 SSE 프레임으로 변환.

### 작업 A — `news_graph.py` — sectors_by_market 헬퍼

```python
DEFAULT_SECTORS_KR = ["반도체", "AI", "자동차", "조선", "제약/바이오", "에너지", "금융"]
DEFAULT_SECTORS_US = ["빅테크", "AI/반도체", "전기차", "헬스케어", "에너지", "금융"]


def default_sectors_for(market: str) -> list[str]:
    if market == "US":
        return DEFAULT_SECTORS_US
    return DEFAULT_SECTORS_KR
```

기존 `DEFAULT_SECTORS` 는 KR 으로 alias 유지 (호환성).

### 작업 B — `routers/news.py` 분기

```python
from asyncio import Queue, create_task, gather, wait

@router.post("/analyze/stream")
async def analyze_news_stream(req: NewsAnalyzeRequest) -> StreamingResponse:
    if req.market == "ALL":
        return StreamingResponse(
            _multi_market_stream(req),
            media_type="text/event-stream",
            headers=_SSE_HEADERS,
        )

    # 기존 단일 시장 분기 — market 필드만 페이로드에 추가하고 그대로 동작
    return StreamingResponse(_single_market_stream(req), ...)


async def _multi_market_stream(req: NewsAnalyzeRequest):
    """KR/US 두 그래프를 병렬 실행하고 이벤트를 interleaving 으로 SSE 출력."""
    yield sse("graph_start", {
        "target_date": req.target_date,
        "market": "ALL",
        "markets": ["KR", "US"],
        "sectors_by_market": {
            "KR": default_sectors_for("KR"),
            "US": default_sectors_for("US"),
        },
    })

    queue: Queue[dict] = Queue()
    final_states: dict[str, dict] = {}

    async def run_one(market: str):
        graph = build_news_graph(streaming=True)
        initial = _initial_state_for(req, market)
        async for ev in graph.astream_events(initial, version="v2"):
            await queue.put({"market": market, "ev": ev})
            etype = ev.get("event")
            name = ev.get("name")
            if etype == "on_chain_end" and name in ("LangGraph", "graph"):
                output = ev.get("data", {}).get("output")
                if isinstance(output, dict):
                    final_states[market] = output
        await queue.put({"market": market, "ev": None})  # 종료 sentinel

    t0 = time.monotonic()
    runners = [create_task(run_one("KR")), create_task(run_one("US"))]

    finished = 0
    while finished < 2:
        item = await queue.get()
        ev = item["ev"]
        if ev is None:
            finished += 1
            continue
        frame = translate_langgraph_event(ev, market=item["market"])
        if frame:
            yield frame

    await gather(*runners, return_exceptions=True)
    run_ms = int((time.monotonic() - t0) * 1000)

    if not final_states:
        yield sse("error", {"message": "그래프 실행 결과를 받지 못했습니다."})
        return

    yield sse("complete", {
        "analysis_date": req.target_date,
        "target_date": req.target_date,
        "run_duration_ms": run_ms,
        "markets": {
            mkt: {
                "market": mkt,
                "overall_analysis": st.get("overall_analysis", ""),
                "sector_analyses": st.get("sector_analyses", {}),
                "sector_article_counts": st.get("sector_article_counts", {}),
                "sector_articles_meta": st.get("sector_articles_meta", {}),
                "sector_signals": st.get("sector_signals", {}),
                "sector_stocks": st.get("sector_stocks", {}),
                "timings": st.get("timings", {}),
            }
            for mkt, st in final_states.items()
        },
    })


def _initial_state_for(req: NewsAnalyzeRequest, market: str) -> AgentState:
    sectors = default_sectors_for(market) if not req.sectors or req.market == "ALL" else req.sectors
    return {
        "target_date": req.target_date,
        "market": market,
        "sectors": sectors,
        "watchlist_companies": req.watchlist_companies,
        "sector_articles": {},
        "sector_articles_meta": {},
        "sector_article_counts": {},
        "sector_analyses": {},
        "sector_signals": {},
        "sector_stocks": {},
        "overall_analysis": "",
        "error_count": 0,
        "timings": {},
    }
```

### 작업 C — translate_langgraph_event market 인자

`ai_service/services/news_stream.py`:

```python
def translate_langgraph_event(ev: dict[str, Any], *, market: str | None = None) -> bytes | None:
    """단일/다중 시장 양쪽에서 호출 가능. market 이 주어지면 모든 페이로드에 포함."""
    # ... 기존 로직 ...
    if etype == "on_chain_start" and name in NODE_NAMES:
        payload = {"node": name}
        if market:
            payload["market"] = market
        return sse("node_start", payload)
    # node_done 도 동일하게 market 추가
    # token 의 경우:
    if etype == "on_chat_model_stream":
        ...
        payload = {"scope": scope, "text": text}
        if sector:
            payload["sector"] = sector
        if market:
            payload["market"] = market
        return sse("token", payload)
```

기존 단일 시장 호출 (`_single_market_stream`) 도 `translate_langgraph_event(ev, market=req.market)` 를 호출해 모든 응답에 market 일관성 부여.

### 검증

```bash
docker exec orneo_ai_service python -c "
import asyncio, httpx, json
async def main():
    async with httpx.AsyncClient(timeout=600) as c:
        async with c.stream('POST','http://localhost:8001/news/analyze/stream',
            json={'target_date':'2026-05-04','market':'ALL'}) as r:
            counters = {}
            async for line in r.aiter_lines():
                if line.startswith('event: '):
                    e = line[7:].strip()
                    counters[e] = counters.get(e, 0) + 1
            print(counters)
asyncio.run(main())
"
```

`graph_start: 1, node_start: 6, node_done: 6, token: <많음>, complete: 1` 정도 (KR 노드 3개 + US 노드 3개).

추가로 `data:` 페이로드에 `market` 키가 들어갔는지도 일부 샘플링.

### 완료 기준
- [ ] `market="ALL"` 분기에서 KR/US 그래프가 동시 실행 (전체 시간 ≈ max(KR, US) 가 아니라 두 배 보다는 짧음)
- [ ] 모든 SSE 페이로드에 `market` 식별자 포함
- [ ] 단일 시장 호출 호환 (회귀 없음)

### 커밋
```
feat(news): ai_service market=ALL 분기 — KR/US 그래프 병렬 + interleaved SSE
```

---

## 꼭지 3: Django proxy 영속화 — markets 페이로드 분기

### 작업

`backend/apps/news/views.py` 의 `_persist_complete_payload`:

```python
@sync_to_async(thread_sensitive=True)
def _persist_complete_payload(target_date: str, market: str, payload: dict) -> None:
    """complete 페이로드를 영속화. market='ALL' 인 경우 markets dict 안의 각 시장을 분리 저장."""
    if "markets" in payload and isinstance(payload["markets"], dict):
        # 다중 시장: 각 시장을 단일 시장 처리로 위임
        for mkt, market_payload in payload["markets"].items():
            _persist_one_market(target_date, mkt, market_payload, payload.get("run_duration_ms"))
        return

    # 단일 시장: 기존 처리
    _persist_one_market(target_date, market, payload, payload.get("run_duration_ms"))


def _persist_one_market(target_date, market, payload, run_duration_ms):
    """단일 NewsAnalysis row 와 NewsSectorAnalysis 를 update_or_create."""
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
            "run_duration_ms": run_duration_ms,
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

`news_analysis_run_stream` 의 body 파싱 — `market="ALL"` 도 그대로 ai_service 에 패스스루.

### 검증

```bash
TOKEN=$(...)
curl -sN --max-time 300 -X POST http://localhost:8000/api/v1/news/analyses/run-stream/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"market":"ALL","target_date":"2026-05-04"}' | grep '^event:' | sort | uniq -c

docker compose exec -T backend python manage.py shell -c "
from apps.news.models import NewsAnalysis
qs = NewsAnalysis.objects.filter(analysis_date='2026-05-04').order_by('market')
for a in qs:
    print(a.market, a.run_status, list(a.sector_analyses.values_list('sector__sector_name_ko','investment_signal','recommended_stocks'))[:3])
"
```

KR/US 각 1 row 가 COMPLETED 로 저장되어야 한다.

### 완료 기준
- [ ] markets 키 분기에서 KR/US 두 row update_or_create
- [ ] 각 row 에 NewsSectorAnalysis 가 시그널/종목 포함해 저장

### 커밋
```
feat(news): Django proxy 영속화 — markets 페이로드 분기 처리
```

---

## 꼭지 4: GET 엔드포인트 `market=ALL` 응답 + URL

### 작업 A — `NewsAnalysisLatestView` / `NewsAnalysisByDateView` 확장

`backend/apps/news/views.py`:

```python
class NewsAnalysisLatestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        market = request.query_params.get("market", "KR")
        if market == "ALL":
            kr = self._latest_for("KR")
            us = self._latest_for("US")
            if not kr and not us:
                raise NotFound("아직 생성된 분석 결과가 없습니다.")
            payload = {
                "analysis_date": (kr or us).analysis_date,
                "run_duration_ms": (kr or us).run_duration_ms,
                "markets": {
                    "KR": NewsAnalysisSerializer(kr).data if kr else None,
                    "US": NewsAnalysisSerializer(us).data if us else None,
                },
            }
            return Response({"status": "success", "data": payload})

        obj = self._latest_for(market)
        if not obj:
            raise NotFound("아직 생성된 분석 결과가 없습니다.")
        return Response({"status": "success", "data": NewsAnalysisSerializer(obj).data})

    @staticmethod
    def _latest_for(market: str):
        return (
            NewsAnalysis.objects.prefetch_related("sector_analyses__sector")
            .filter(market=market, run_status="COMPLETED")
            .order_by("-analysis_date")
            .first()
        )
```

`NewsAnalysisByDateView` 동일 패턴.

> 기존 응답이 generic ListAPIView/RetrieveAPIView 였는데 이제는 APIView 로 변환. `pagination` 등은 사용하지 않으므로 호환.

### 작업 B — Daily Celery 양시장

`backend/apps/news/tasks.py`:

```python
@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def run_daily_news_analysis(
    self,
    target_date: str | None = None,
    market: str = "KR",
    sectors: list[str] | None = None,
    engine: str = "langgraph",
) -> dict:
    target_date = target_date or str(date.today())

    if market == "ALL":
        # 양시장 동시 호출 (단일 ai_service 요청)
        sectors = sectors or []  # ai_service 가 시장별 default 사용
        return _run_one(target_date, "ALL", sectors, engine, self)

    sectors = sectors or list(
        MarketSector.objects.filter(is_active=True, market__in=[market, "ALL"])
        .order_by("display_order")
        .values_list("sector_name_ko", flat=True)
    )
    return _run_one(target_date, market, sectors, engine, self)
```

또한 Celery beat 의 매일 작업이 KR/US 양쪽을 호출하도록 `market="ALL"` 로 enqueue.

### 작업 C — URL 등록

`backend/apps/news/urls.py` 변경 없음 (기존 `analyses/latest/` 경로 그대로, query 로 `market=ALL` 분기).

### 검증

```bash
TOKEN=$(...)
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/v1/news/analyses/latest/?market=ALL" | python3 -m json.tool | head -30
```

응답 `data.markets.KR` 와 `data.markets.US` 양쪽이 있어야 한다.

### 완료 기준
- [ ] `market=ALL` 응답 시 markets dict 구조
- [ ] 단일 시장 응답은 기존 평면 구조 유지

### 커밋
```
feat(news): GET 엔드포인트 market=ALL 응답 + Celery 양시장 처리
```

---

## 꼭지 5: 프론트 SSE 컨슈머 — market 별 분리 + 임시 토글

### 작업 A — state 구조 확장

`frontend/src/components/news/NewsBriefingDetail.tsx`:

```tsx
const [streamingActive, setStreamingActive] = useState(false);

// market → sector → SectorStream
const [streamSectors, setStreamSectors] = useState<
  Record<MarketCode, Record<string, SectorStream>>
>({ KR: {}, US: {} });

const [streamOverall, setStreamOverall] = useState<
  Record<MarketCode, { text: string; status: StreamStatus }>
>({
  KR: { text: "", status: "pending" },
  US: { text: "", status: "pending" },
});

const [sectorOrder, setSectorOrder] = useState<Record<MarketCode, string[]>>({
  KR: [],
  US: [],
});

const [activeMarket, setActiveMarket] = useState<MarketCode>("KR");
const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
```

### 작업 B — SSE 이벤트 핸들러 분기

```tsx
case "graph_start": {
  const data = ev.data as GraphStartEv;
  const sbm = data.sectors_by_market ?? { KR: data.sectors ?? [], US: [] };
  setSectorOrder({ KR: sbm.KR ?? [], US: sbm.US ?? [] });
  const blank = (xs: string[]) =>
    Object.fromEntries(xs.map((s) => [s, { text: "", status: "pending" as StreamStatus }]));
  setStreamSectors({ KR: blank(sbm.KR ?? []), US: blank(sbm.US ?? []) });
  break;
}
case "node_start": {
  const data = ev.data as NodeEv;
  const mkt = (data.market as MarketCode) ?? activeMarket;
  if (data.node === "sector_analyze_node") {
    setStreamSectors((prev) => {
      const next = { ...prev };
      next[mkt] = { ...prev[mkt] };
      for (const k of Object.keys(next[mkt])) {
        if (next[mkt][k].status === "pending") next[mkt][k] = { ...next[mkt][k], status: "streaming" };
      }
      return next;
    });
  } else if (data.node === "aggregate_node") {
    setStreamOverall((prev) => ({ ...prev, [mkt]: { ...prev[mkt], status: "streaming" } }));
  }
  break;
}
case "token": {
  const data = ev.data as TokenEv;
  const mkt = (data.market as MarketCode) ?? activeMarket;
  // ... market 별 누적 ...
}
case "node_done": {
  // market 별로 sector_analyses, sector_signals 적용
}
case "complete": {
  await loadAnalysis();   // FullAnalysis 로딩
  addToast("분석이 완료되었습니다.", "success");
  break;
}
```

### 작업 C — `loadAnalysis` FullAnalysis 처리

```tsx
const loadAnalysis = useCallback(async () => {
  setLoading(true);
  setErrorMsg(null);
  try {
    const path = initialDate
      ? `/news/analyses/by-date/${initialDate}/?market=ALL`
      : `/news/analyses/latest/?market=ALL`;
    const res = await api.get<FullAnalysis>(path);
    setAnalysis(res);
  } catch (err) {
    ...
  } finally {
    setLoading(false);
  }
}, [initialDate]);
```

기존 `NewsAnalysis` 단일 시장 응답 형태에서 `FullAnalysis` 로 변경. 컴포넌트 내부에서 `analysis.markets[activeMarket]` 로 접근.

### 작업 D — `handleRegenerate` body

```tsx
res = await fetch("/api/v1/news/analyses/run-stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ market: "ALL", target_date: targetDate }),
});
```

### 작업 E — 임시 MarketToggle (디자인은 session 30)

```tsx
<div className="flex gap-1">
  {(["KR", "US"] as const).map((m) => (
    <button
      key={m}
      onClick={() => setActiveMarket(m)}
      className={`rounded px-2 py-1 text-xs font-semibold ${
        activeMarket === m
          ? "bg-[var(--color-primary)] text-white"
          : "border border-[var(--color-border)] text-[var(--color-text-sub)]"
      }`}
    >
      {m === "KR" ? "🇰🇷 KR" : "🇺🇸 US"}
    </button>
  ))}
</div>
```

이 토글을 헤더 또는 결과 영역 상단에 임시 노출. 디자인은 session 30 에서 정식 컴포넌트로 교체.

### 검증

브라우저에서 "다시 생성" 클릭:
1. 양시장 placeholder 카드가 토글에 따라 다르게 표시 (KR 7개 / US 6개)
2. 각 시장 카드에 token 이 누적
3. 종합 요약도 KR/US 별도로 작성 중 / 완료 표시
4. complete 후 `analysis.markets.KR` / `.US` 정상 로드, 토글 시 화면 전환

### 완료 기준
- [ ] 양시장 SSE 가 interleaved 로 올라와도 시장별 누적 정상
- [ ] 토글로 시장 전환 시 데이터 분기 정상
- [ ] 새로고침 후 `latest/?market=ALL` 응답으로 양시장 모두 로드

### 커밋
```
feat(news): 프론트 SSE 컨슈머 양시장 분기 + 임시 MarketToggle
```

---

## 꼭지 6 (옵션): 라우팅 설계 메모

`/news` 와 `/news/[date]` 는 그대로 유지 (양시장 토글이 화면 안에서 처리). URL 에 시장 식별자를 노출하지 않음 — 디자인 단순성 우선.

후속 변경 후보:
- `/news?market=US` 처럼 query 로 초기 토글 상태를 결정
- `/news/<date>` 가 양시장 항상 fetch, 토글은 클라이언트 state

이번 세션에서는 query 미적용. session 30 UI 적용 시 결정.

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/news-dual-market

gh pr create --base dev \
  --title "[feat] KR+US 양시장 병렬 분석 + FullAnalysis 응답" \
  --body "..."

gh pr merge <N> --merge --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/news-dual-market" \
  --body "..."

git checkout dev && git pull origin dev
git branch -d feat/news-dual-market
mv prompts/session_29_news_dual_market.md prompts/_complete/
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

- **Tavily 호출 비용 2배** — KR/US 합쳐 13개 섹터 검색이 동시에 발생. 일일 한도 모니터링 필요
- **LLM 호출 시간** — KR 7섹터 + 종합, US 6섹터 + 종합 = 15회. Gemma 응답이 섹터당 20~30s 라면 병렬이라도 70~120s. UI 의 watchdog 토스트 임계값(현재 30s) 재검토
- **single market 호출 호환** — 기존 데일리 Celery 가 `market="KR"` 으로 enqueue 되어 있다면 그대로 유지될지, beat 스케줄을 `market="ALL"` 으로 바꿀지 결정 필요. 이번 세션에서는 ALL 로 변경하되 backward compat 위해 KR/US 단일 호출도 유지
- **NewsAnalysisLatestView/ByDateView** — 기존 generic.RetrieveAPIView 를 APIView 로 바꾸면 swagger 문서 등 다른 자동 generation 영향 가능성. 확인 필요
- **관련 후속 세션**: session 30 (UI), session 31 (검색 진행 표시)
