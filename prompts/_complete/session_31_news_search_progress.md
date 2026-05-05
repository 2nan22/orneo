# Session 31: multi_search 진행 중 섹터별 검색 결과 실시간 표시

> **세션 목표**: `multi_search_node` 가 섹터별 Tavily 검색을 마칠 때마다 LangGraph custom event 를 dispatch 하고, ai_service SSE 가 이를 `search_result` 이벤트로 emit 한다. 프론트는 SearchResultCard 로 검색 진행을 0.5~2초 간격으로 시연한다. Canvas 디자인의 "1. 글로벌 데이터 수집" 단계에 해당.
> **예상 소요**: 3 ~ 4시간
> **브랜치**: `feat/news-search-progress` (dev에서 분기)
> **선행 세션**: Session 30 (Canvas UI 적용) 완료
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
# 디자인 결과물 (특히 SearchResultCard)
Read /Users/2nan/Documents/Project/2026_oreneo/canvas/news_briefing.tsx

# AI 서비스
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_graph.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_stream.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/routers/news.py

# 프론트
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/NewsBriefingDetail.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/StreamingSectorCard.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/sse.ts
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/types.ts
```

LangGraph custom event 문서 한 번 빠르게 확인:
```bash
docker exec orneo_ai_service python -c "
from langgraph.types import dispatch_custom_event
help(dispatch_custom_event)
" 2>&1 | head -30
```

---

## 배경 (현 상태)

세션 27~30 으로 다음이 완성:
- LangGraph 노드별 SSE 스트리밍 (graph_start, node_start/done, token, complete)
- 섹터별 시그널/종목 산출 + 양시장 병렬 + Canvas UI

남은 캐버스 요구사항: **multi_search_node 진행 중 섹터별 검색 결과 스니펫을 실시간으로 표시**. 현재 `node_done(multi_search_node)` 까지 ~5초가 걸려, 그 동안 화면에는 단일 spinner 만 보인다. Canvas 디자인은 그 5초 동안 6~13개 섹터 카드가 1초 간격 정도로 채워지길 원함.

---

## SSE 이벤트 프로토콜 — 신규 이벤트

| event | data |
|-------|------|
| `search_result` | `{market: "KR"\|"US", sector: "반도체", snippet: "...첫 기사 본문 80자...", title: "...", url: "https://...", count: 5}` |

발행 시점: `multi_search_node` 안에서 각 섹터별 Tavily 호출 직후. 발행 매체: LangGraph custom event (`langgraph.types.dispatch_custom_event` or 동등 메커니즘) → `astream_events` 가 `on_custom_event` 로 노출.

---

## 꼭지 1: LangGraph custom event 학습 + 동작 검증

### 작업

`langgraph` 버전 확인 + `dispatch_custom_event` API 사용법 점검:

```bash
docker exec orneo_ai_service python -c "
import langgraph
print('langgraph version:', getattr(langgraph,'__version__','unknown'))
from langgraph.types import dispatch_custom_event
print(dispatch_custom_event.__doc__)
"
```

또는 `langgraph` 가 해당 API 를 노출하지 않으면 대안: `langchain_core.runnables.config` 또는 `langchain_core.callbacks` 의 `dispatch_custom_event`.

테스트 스크립트:
```python
# /tmp/lg_custom_event_test.py
import asyncio
from langgraph.graph import END, StateGraph
from typing import TypedDict
from langgraph.types import dispatch_custom_event   # or fallback

class S(TypedDict):
    x: int

async def n1(s: S) -> dict:
    for i in range(3):
        await dispatch_custom_event("ping", {"i": i})
        await asyncio.sleep(0.1)
    return {"x": s["x"] + 1}

g = StateGraph(S)
g.add_node("n1", n1)
g.set_entry_point("n1")
g.add_edge("n1", END)
graph = g.compile()

async def main():
    async for ev in graph.astream_events({"x": 0}, version="v2"):
        if ev.get("event") == "on_custom_event":
            print(ev["name"], ev["data"])
asyncio.run(main())
```

→ `ping {'i': 0} ping {'i': 1} ping {'i': 2}` 출력 확인.

### 완료 기준
- [ ] `dispatch_custom_event` API 위치 + 시그니처 확정
- [ ] `astream_events(version="v2")` 가 `on_custom_event` 를 emit 함을 직접 확인
- [ ] dispatch 가 노드 함수 안에서 await 가능 (async 컨텍스트)

### 커밋 (없음 — 학습/탐색 결과를 다음 꼭지 코드 주석에 반영)

---

## 꼭지 2: `multi_search_node` 에서 섹터별 emit

### 작업

`ai_service/services/news_graph.py`:

```python
from langgraph.types import dispatch_custom_event   # ← 꼭지 1 결과로 확정


async def multi_search_node(state: AgentState) -> dict:
    """섹터별 Tavily 검색 + 진행 상황 custom event emit."""
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

            # 진행 이벤트 emit — 첫 결과의 snippet 을 80자로 truncate
            top = results[0] if results else None
            snippet = (top.get("content", "")[:80] + "…") if top and top.get("content") else ""
            await dispatch_custom_event(
                "search_result",
                {
                    "market": market,
                    "sector": sector,
                    "snippet": snippet,
                    "title": (top or {}).get("title", "") if top else "",
                    "url": (top or {}).get("url", "") if top else "",
                    "count": len(results),
                },
            )
        except Exception as exc:
            logger.error("섹터 '%s' 검색 실패: %s", sector, exc)
            sector_articles[sector] = []
            sector_articles_meta[sector] = []
            # 실패도 0건 이벤트로 알림
            await dispatch_custom_event(
                "search_result",
                {
                    "market": market,
                    "sector": sector,
                    "snippet": "",
                    "title": "",
                    "url": "",
                    "count": 0,
                },
            )

    total = sum(len(v) for v in sector_articles.values())
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    return {
        "sector_articles": sector_articles,
        "sector_articles_meta": sector_articles_meta,
        "error_count": state["error_count"] + (0 if total > 0 else 1),
        "timings": {**state.get("timings", {}), "multi_search_ms": elapsed_ms},
    }
```

> 양시장 병렬 (session 29) 환경에서 dispatch_custom_event 도 정상 emit 되는지 검증 필요. 같은 그래프 인스턴스를 동시에 두 개 실행하므로 이벤트 라우팅이 올바른지.

### 검증

ai_service 컨테이너에서 단일 시장:
```bash
docker exec orneo_ai_service python -c "
import asyncio, httpx, json
async def main():
    async with httpx.AsyncClient(timeout=600) as c:
        async with c.stream('POST','http://localhost:8001/news/analyze/stream',
            json={'target_date':'2026-05-04','market':'KR'}) as r:
            count = {}
            async for line in r.aiter_lines():
                if line.startswith('event: '):
                    e = line[7:].strip()
                    count[e] = count.get(e, 0) + 1
                if 'search_result' in line:
                    print(line[:200])
            print('totals:', count)
asyncio.run(main())
"
```

`search_result` 가 7개 (KR 섹터 수) emit 되어야 한다. 양시장 (`market=ALL`) 으로도 동일 검증, 13개 emit.

### 완료 기준
- [ ] multi_search_node 에서 섹터당 1건 search_result emit
- [ ] 검색 실패 섹터도 count=0 으로 emit
- [ ] 양시장 병렬 시 KR/US 양쪽 모두 emit (총 13개)

### 커밋
```
feat(news): multi_search_node 에서 섹터별 search_result custom event dispatch
```

---

## 꼭지 3: `news_stream` translate — on_custom_event 처리

### 작업

`ai_service/services/news_stream.py`:

```python
def translate_langgraph_event(ev: dict[str, Any], *, market: str | None = None) -> bytes | None:
    name = ev.get("name") or ""
    etype = ev.get("event") or ""
    tags = ev.get("tags") or []

    # ... 기존 분기 ...

    # custom event — search_result
    if etype == "on_custom_event" and name == "search_result":
        data = ev.get("data") or {}
        if not isinstance(data, dict):
            return None
        # data 자체가 emit 한 dict — market/sector/snippet/title/url/count
        return sse("search_result", data)

    return None
```

> custom event 의 data 구조는 langgraph 버전에 따라 차이 가능 — 테스트로 `print(ev)` 한 번 해보고 정확한 키 위치 확정.

`routers/news.py` 의 `_multi_market_stream` 도 변경 없음 (translate_langgraph_event 가 모든 처리).

### 검증

위 꼭지 2 스크립트로 SSE 라인 직접 확인:
```
event: search_result
data: {"market":"KR","sector":"반도체","snippet":"트렌드포스 리포트...","title":"...","url":"...","count":5}
```

### 완료 기준
- [ ] SSE 응답에 `event: search_result` 가 정상 포함
- [ ] 페이로드의 market/sector/snippet/count 가 모두 채워짐

### 커밋
```
feat(news): SSE search_result 이벤트 변환 + 프로토콜 추가
```

---

## 꼭지 4: 프론트 — SearchResultCard 컴포넌트

### 작업

`frontend/src/components/news/SearchResultCard.tsx` (신규):

```tsx
// frontend/src/components/news/SearchResultCard.tsx
"use client";

interface Props {
  sector: string;
  snippet: string;
  title?: string;
  url?: string;
  count: number;
  state?: "loading" | "done";
}

export default function SearchResultCard({
  sector,
  snippet,
  title,
  url,
  count,
  state = "done",
}: Props) {
  const isEmpty = state === "done" && count === 0;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 sm:flex-row sm:items-center sm:gap-3">
      <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--color-bg)] px-3 py-1.5 text-xs font-bold text-[var(--color-text)]">
        {sector}
      </span>
      <div className="min-w-0 flex-1">
        {state === "loading" ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-sub)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
            검색 중…
          </div>
        ) : isEmpty ? (
          <p className="text-xs text-[var(--color-text-sub)]">수집된 기사가 없습니다.</p>
        ) : (
          <p className="truncate text-[13px] text-[var(--color-text)]">
            <span className="mr-2 font-semibold">문서 수집 ({count}건):</span>
            {snippet}
          </p>
        )}
        {url && state === "done" && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-[10px] text-[var(--color-primary)] hover:underline"
          >
            {title || url}
          </a>
        )}
      </div>
    </div>
  );
}
```

### 완료 기준
- [ ] loading / done(count>0) / done(count=0) 세 상태 시각적 차이
- [ ] snippet 가 1줄로 truncate

### 커밋
```
feat(news): SearchResultCard 컴포넌트
```

---

## 꼭지 5: NewsBriefingDetail — search_result state + UI 노출

### 작업 A — state 추가

```tsx
type SearchResultEntry = {
  state: "loading" | "done";
  snippet: string;
  title: string;
  url: string;
  count: number;
};

const [searchResults, setSearchResults] = useState<
  Record<MarketCode, Record<string, SearchResultEntry>>
>({ KR: {}, US: {} });
```

### 작업 B — graph_start 시 loading 채우기

```tsx
case "graph_start": {
  const data = ev.data as GraphStartEv;
  const sbm = data.sectors_by_market ?? { KR: data.sectors ?? [], US: [] };
  // ... 기존 sectorOrder/streamSectors 처리 ...
  const blankSearch = (xs: string[]) =>
    Object.fromEntries(xs.map((s) => [s, {
      state: "loading" as const, snippet: "", title: "", url: "", count: 0,
    }]));
  setSearchResults({ KR: blankSearch(sbm.KR ?? []), US: blankSearch(sbm.US ?? []) });
  break;
}
```

### 작업 C — search_result 이벤트 처리

```tsx
case "search_result": {
  const data = ev.data as {
    market: MarketCode; sector: string; snippet: string;
    title: string; url: string; count: number;
  };
  setSearchResults((prev) => ({
    ...prev,
    [data.market]: {
      ...prev[data.market],
      [data.sector]: {
        state: "done",
        snippet: data.snippet,
        title: data.title,
        url: data.url,
        count: data.count,
      },
    },
  }));
  break;
}
```

### 작업 D — 스트리밍 영역에 SearchResultCard 그리드

`StreamingSectorCard` 그리드 위쪽에 검색 결과 영역 추가:

```tsx
{streamingActive && (
  <div className="mb-4 flex flex-col gap-3">
    <Card padding="md" variant="outlined">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--color-text)]">실시간 분석</h2>
        <MarketToggle value={activeMarket} onChange={setActiveMarket} />
      </div>

      {/* 1단계: 글로벌 데이터 수집 */}
      <div className="mb-3 flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
          1. 글로벌 데이터 수집
        </p>
        {sectorOrder[activeMarket].map((name) => {
          const r = searchResults[activeMarket]?.[name] ?? {
            state: "loading" as const, snippet: "", title: "", url: "", count: 0,
          };
          return (
            <SearchResultCard
              key={`${activeMarket}-${name}`}
              sector={name}
              snippet={r.snippet}
              title={r.title}
              url={r.url}
              count={r.count}
              state={r.state}
            />
          );
        })}
      </div>

      {/* 2단계: 섹터별 분석 */}
      <p className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)]">
        2. 섹터별 분석
      </p>
      <div className="flex flex-col gap-3">
        {sectorOrder[activeMarket].map((name) => {
          const s = streamSectors[activeMarket]?.[name] ?? { text: "", status: "pending" as StreamStatus };
          return (
            <StreamingSectorCard
              key={`${activeMarket}-${name}`}
              name={name}
              text={s.text}
              status={s.status}
              articleCount={s.articleCount}
              elapsedMs={s.elapsedMs}
              signal={s.signal}
              stocks={s.stocks}
            />
          );
        })}
      </div>

      {/* 3단계: 종합 요약 (기존 streamOverall 영역) */}
    </Card>
  </div>
)}
```

### 검증

브라우저 — "다시 생성" 클릭:
1. 0~1초 안에 13개 SearchResultCard 가 loading 상태로 등장
2. 0.5~2초 간격으로 각 카드가 done 상태로 전환 (snippet 채워짐)
3. multi_search_node 완료 후 (~5초) 모든 카드 done
4. 그 다음 sector_analyze 진행 → StreamingSectorCard 가 streaming → done
5. 종합 요약 영역도 진행

watchdog 토스트 (현재 30초) 가 검색 단계에서 트리거되지 않아야 한다.

### 완료 기준
- [ ] graph_start 이후 카드 13개 loading 상태로 즉시 등장
- [ ] search_result 이벤트마다 해당 카드 done 전환
- [ ] 카드 안 snippet 가 1줄로 표시 + url 링크 노출
- [ ] 양시장 토글 시 KR/US 카드 분기

### 커밋
```
feat(news): SearchResultCard + 검색 진행 단계 UI
```

---

## 꼭지 6 (옵션): timing 메트릭에 search_result 표시

`timings.multi_search_ms` 가 이미 적재되어 있으니, 검색 단계 끝났을 때 화면 어딘가에 "검색 5.2s 완료" 정도 표시. 시간 남으면 진행.

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/news-search-progress

gh pr create --base dev \
  --title "[feat] multi_search 진행 중 섹터별 검색 결과 SSE 이벤트" \
  --body "..."

gh pr merge <N> --merge --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/news-search-progress" \
  --body "..."

git checkout dev && git pull origin dev
git branch -d feat/news-search-progress
mv prompts/session_31_news_search_progress.md prompts/_complete/
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

- **LangGraph custom event API 변경 가능성** — 라이브러리 업그레이드 시 import path / 시그니처 변경 가능. 꼭지 1 의 학습 결과를 코드 주석으로 남겨 향후 디버깅 시 참고
- **dispatch_custom_event 의 동기/비동기 컨텍스트** — 테스트 결과에 따라 await 필요/불필요 결정. 잘못 호출하면 emit 누락
- **SSE 페이로드 크기** — snippet 80자로 truncate 했지만 title/url 까지 합치면 1KB 미만. 검색 결과 수 늘리면(max_results=10) 페이로드 폭증 가능. 80자 limit 유지 권장
- **Tavily 호출 실패율** — `count=0` 카드가 너무 자주 표시되면 사용자 경험 저하. Tavily 응답 안정성 모니터링
- **이번 4세션 시리즈 종료** — session 31 까지 완료하면 Canvas 디자인이 모두 적용된다. 후속 작업 후보:
  - apply_metric_adjustment 의 실제 metric 통합 (감정 분석 등)
  - 평균 분석 시간 푸터 노출 (session 27 꼭지 6 옵션)
  - session 32 — 섹터별 종목 추천 v2 (뉴스 + 재무지표 결합)
