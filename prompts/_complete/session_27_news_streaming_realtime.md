# Session 27: 뉴스 분석 노드별 실시간 스트리밍 + Timeout/메트릭 강화

> **세션 목표**: "다시 생성" 버튼을 누르면 LangGraph 노드별 진행 + Gemma 토큰 스트리밍이 SSE로 흘러내리도록 만들고, 카드가 단계별로 등장하면서 그 안에서 텍스트가 타이핑되는 UX를 구현한다. 데일리 자동 분석(Celery beat) 경로는 그대로 두되 timeout 한도 확장 + 노드별 timing 메트릭 저장으로 평균 분석 시간 데이터를 누적한다.
> **예상 소요**: 5 ~ 6시간
> **브랜치**: `feat/news-streaming-realtime` (dev에서 분기)
> **선행 세션**: Session 26 (뉴스 브리핑 품질 개선) 완료
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
# AI 분석 파이프라인
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_graph.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/routers/news.py

# 백엔드 (뷰·태스크·시리얼라이저·URL)
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/views.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/urls.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/tasks.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/serializers.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/models.py

# 프론트 (다시 생성 + 프록시)
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/NewsBriefingDetail.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/app/api/v1/[...path]/route.ts
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/api.ts
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/types.ts
```

---

## 배경 (현 상태)

세션 26에서 출력 포맷·`article_count`·마크다운 렌더링은 정리됐지만, "다시 생성" 버튼은 여전히 **블로킹/폴링** 구조다.

- `NewsBriefingDetail.tsx`의 `handleRegenerate()` → `POST /news/analyses/run/` → Celery 태스크 enqueue → 3초마다 `/news/analyses/tasks/{task_id}/` 폴링 → `state="SUCCESS"`가 와야 화면 갱신
- ai_service `news_graph.py` 는 6개 섹터 LLM(20~30초/섹터) + 종합 1회를 **모두 끝낸 뒤** 한 번에 응답
- 폴링 한도 `MAX_POLLS = 60`, 인터벌 3s → 총 3분 초과 시 토스트만 띄우고 종료
- 결과: 사용자가 30초~3분 내내 스피너만 보다가 한 번에 결과를 받음. 중간 실패(예: Ollama 다운) 시 빈 fallback만 보임

LangGraph는 `astream_events(version="v2")` 로 **노드 시작/끝 + Gemma 토큰** 이벤트를 그대로 emit할 수 있고, `ChatOpenAI(streaming=True)` 만 켜면 Ollama-호환 스트림이 흘러옴. SSE로 이걸 프론트까지 전달해 카드 단계별 등장 + 카드 내 타이핑 UX를 만든다.

**데일리 자동 분석 경로는 그대로 둔다**: `celery_beat` → `run_daily_news_analysis` → `httpx.post /news/analyze` (블로킹). 이쪽은 timeout 확장 + 노드별 timing 저장만 추가한다.

---

## SSE 이벤트 프로토콜 (이번 세션의 계약)

한 프레임 = `event: <type>\ndata: <json>\n\n`

| event | data 예 | 의미 |
|-------|---------|------|
| `graph_start` | `{target_date, market, sectors}` | 그래프 시작. UI는 sectors placeholder 카드 6개 깐다 |
| `search_progress` | `{sector, articles_count}` | 섹터 검색 끝날 때마다 1회 |
| `search_done` | `{sector_article_counts: {...}, sector_articles_meta: {...}, elapsed_ms}` | multi_search_node 완료 |
| `node_start` | `{node: "sector_analyze", sector: "반도체"}` 또는 `{node: "aggregate"}` | 해당 카드 status="streaming" |
| `token` | `{scope: "sector", sector: "반도체", text: "##"}` 또는 `{scope: "aggregate", text: "..."}` | 누적 텍스트에 append |
| `node_done` | `{node, sector?, elapsed_ms, full_text}` | 정확한 full_text로 교정 + status="done" |
| `complete` | `{overall_analysis, sector_analyses, sector_article_counts, sector_articles_meta, timings, run_duration_ms}` | 최종 결과. UI는 정식 NewsAnalysis 객체로 교체 |
| `error` | `{message, node?}` | 토스트 + status 초기화 |

**timings 스키마** (모든 경로 공통):
```json
{
  "multi_search_ms": 1234,
  "sector_analyze_ms": {"반도체": 23456, "AI": 22134, "조선": 19567, ...},
  "aggregate_ms": 4567,
  "total_ms": 67890
}
```

---

## 꼭지 1: Timeout 확장 + 노드별 timing 저장 (선결 인프라)

### 배경

스트리밍을 도입해도 데일리 Celery 경로는 그대로 살아있다. 두 경로 모두 동일한 `NewsAnalysis.raw_result["timings"]` 형식을 쓰도록 먼저 정렬해 둔다. 이후 꼭지 2~5에서 같은 메트릭을 재사용한다.

### 작업 A — Celery httpx timeout & 프론트 폴링 한도

`backend/apps/news/tasks.py`:
```python
resp = httpx.post(
    f"{AI_SERVICE_URL}/news/analyze",
    json={...},
    headers={"X-Service-Secret": AI_SERVICE_SECRET},
    timeout=600,   # 300 → 600 (10분)
)
```

`frontend/src/components/news/NewsBriefingDetail.tsx`:
```ts
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 200; // 60 → 200 (10분). 꼭지 5에서 폴링 분기 자체가 사용 빈도 ↓
```

### 작업 B — 노드별 timing 측정

`ai_service/services/news_graph.py` 의 각 노드에서 `time.monotonic()` 으로 진입/종료 시간 측정. 결과를 `state["timings"]` 에 누적:

```python
class AgentState(TypedDict):
    ...
    timings: dict[str, Any]  # 신규
    ...

async def multi_search_node(state: AgentState) -> dict:
    t0 = time.monotonic()
    # ... 기존 로직 ...
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    return {
        "sector_articles": sector_articles,
        "sector_articles_meta": sector_articles_meta,
        "error_count": ...,
        "timings": {**state.get("timings", {}), "multi_search_ms": elapsed_ms},
    }

async def sector_analyze_node(state: AgentState) -> dict:
    t_total = time.monotonic()
    sector_ms: dict[str, int] = {}
    for sector, articles in state["sector_articles"].items():
        t0 = time.monotonic()
        # ... LLM 호출 ...
        sector_ms[sector] = int((time.monotonic() - t0) * 1000)
    return {
        "sector_analyses": sector_analyses,
        "timings": {**state.get("timings", {}), "sector_analyze_ms": sector_ms},
    }

async def aggregate_node(state: AgentState) -> dict:
    t0 = time.monotonic()
    # ... LLM 호출 ...
    elapsed_ms = int((time.monotonic() - t0) * 1000)
    timings = {**state.get("timings", {}), "aggregate_ms": elapsed_ms}
    timings["total_ms"] = sum([
        timings.get("multi_search_ms", 0),
        sum(timings.get("sector_analyze_ms", {}).values()),
        timings.get("aggregate_ms", 0),
    ])
    return {
        "overall_analysis": overall,
        "sector_article_counts": ...,
        "sector_articles_meta": ...,
        "timings": timings,
    }
```

### 작업 C — 응답 스키마 + Celery 저장

`ai_service/routers/news.py`:
```python
class NewsAnalyzeResponse(BaseModel):
    overall_analysis: str
    sector_analyses: dict[str, str]
    sector_article_counts: dict[str, int]
    sector_articles_meta: dict[str, list[dict]] = {}
    timings: dict[str, Any] = {}        # 신규
    run_duration_ms: int

# analyze_news() 안에서 result.get("timings", {}) 그대로 전달
```

`backend/apps/news/tasks.py`:
```python
analysis_obj.raw_result = {
    "sector_analyses": data["sector_analyses"],
    "sector_article_counts": data.get("sector_article_counts", {}),
    "sector_articles_meta": data.get("sector_articles_meta", {}),
    "timings": data.get("timings", {}),
}
```

### 검증

```bash
# Celery로 1회 강제 실행 후 timings 확인
docker compose exec -T backend python manage.py shell -c "
from apps.news.tasks import run_daily_news_analysis
run_daily_news_analysis.delay(target_date='2026-05-04', market='KR')
"
# 잠시 후
docker compose exec -T backend python manage.py shell -c "
from apps.news.models import NewsAnalysis
a = NewsAnalysis.objects.filter(market='KR').order_by('-updated_at').first()
print(a.run_status, a.run_duration_ms)
print(a.raw_result.get('timings'))
"
```

### 완료 기준
- [ ] `tasks.py` httpx timeout 600s
- [ ] `NewsBriefingDetail.tsx` MAX_POLLS 200
- [ ] `NewsAnalysis.raw_result["timings"]` 가 `{multi_search_ms, sector_analyze_ms: {6 sectors}, aggregate_ms, total_ms}` 모두 채워짐

### 커밋
```
chore(news): timeout 한도 확장 + 노드별 timing 저장
```

---

## 꼭지 2: ai_service 스트리밍 엔드포인트 `POST /news/analyze/stream`

### 배경

LangGraph `astream_events(version="v2")` 가 emit 하는 이벤트를 SSE 프레임으로 변환해 흘려보내는 단일 진입점. 기존 `/news/analyze` 는 데일리 Celery용으로 보존.

### 작업 A — `_make_llm` 스트리밍 분기

`ai_service/services/news_graph.py`:
```python
def _make_llm(streaming: bool = False) -> ChatOpenAI:
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
```

`build_news_graph(streaming: bool = False)` 형태로 받아 sector_analyze/aggregate 노드 안에서 `_make_llm(streaming)`. 노드 함수가 streaming 플래그를 받기 어려우면 closure 또는 모듈 변수로 전달.

### 작업 B — 이벤트 변환 헬퍼 (신규 모듈)

`ai_service/services/news_stream.py` (신규):
```python
"""LangGraph astream_events → SSE 프레임 변환."""

import json
from typing import Any

def sse(event: str, data: dict) -> bytes:
    """SSE 한 프레임을 bytes로 만들어 반환."""
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n".encode("utf-8")


def translate_langgraph_event(ev: dict[str, Any]) -> bytes | None:
    """LangGraph astream_events 이벤트 1건을 SSE 프레임으로 변환.

    Returns None if the event should not be emitted to the client.
    """
    # ev["event"]: on_chain_start | on_chain_end | on_chat_model_stream | ...
    # ev["name"]: 노드 이름 (e.g. "sector_analyze_node", "aggregate_node", "ChatOpenAI")
    # ev["tags"]: 우리가 LLM 호출 시 부여한 태그 (예: ["sector:반도체"]) — 섹터 식별 키
    # ev["data"]: { "chunk": AIMessageChunk(...) | input | output }

    name = ev.get("name")
    etype = ev.get("event")
    tags = ev.get("tags", []) or []

    # 1) 노드 시작/끝
    if etype == "on_chain_start" and name in ("multi_search_node", "sector_analyze_node", "aggregate_node"):
        return sse("node_start", {"node": name})
    if etype == "on_chain_end" and name in ("multi_search_node", "sector_analyze_node", "aggregate_node"):
        return sse("node_done", {"node": name})

    # 2) 토큰 스트림
    if etype == "on_chat_model_stream":
        chunk = ev.get("data", {}).get("chunk")
        text = getattr(chunk, "content", "") or ""
        if not text:
            return None
        scope = "sector" if any(t.startswith("sector:") for t in tags) else "aggregate"
        sector = next((t.split(":", 1)[1] for t in tags if t.startswith("sector:")), None)
        payload = {"scope": scope, "text": text}
        if sector:
            payload["sector"] = sector
        return sse("token", payload)

    return None
```

`sector_analyze_node` 안에서 LLM 호출 시 섹터 태그 부여:
```python
resp = await llm.ainvoke(
    [SystemMessage(content=SECTOR_ANALYZE_SYSTEM), HumanMessage(content=user_prompt)],
    config={"tags": [f"sector:{sector}"]},
)
```

### 작업 C — 라우터 추가

`ai_service/routers/news.py`:
```python
from fastapi.responses import StreamingResponse
from services.news_stream import sse, translate_langgraph_event

@router.post("/analyze/stream")
async def analyze_news_stream(req: NewsAnalyzeRequest):
    """SSE로 노드/토큰 단위 진행을 흘려보낸다."""
    async def event_gen():
        try:
            yield sse("graph_start", {
                "target_date": req.target_date,
                "market": req.market,
                "sectors": req.sectors,
            })
            graph = build_news_graph(streaming=True)
            initial: AgentState = {
                "target_date": req.target_date,
                "market": req.market,
                "sectors": req.sectors,
                "watchlist_companies": req.watchlist_companies,
                "sector_articles": {},
                "sector_articles_meta": {},
                "sector_article_counts": {},
                "sector_analyses": {},
                "overall_analysis": "",
                "error_count": 0,
                "timings": {},
            }
            t0 = time.monotonic()
            final_state: dict | None = None
            async for ev in graph.astream_events(initial, version="v2"):
                frame = translate_langgraph_event(ev)
                if frame:
                    yield frame
                # 그래프 전체 종료 이벤트에서 최종 state 캡처
                if ev.get("event") == "on_chain_end" and ev.get("name") == "LangGraph":
                    final_state = ev.get("data", {}).get("output")
            run_ms = int((time.monotonic() - t0) * 1000)

            if final_state is None:
                yield sse("error", {"message": "그래프 실행 결과를 받지 못했습니다."})
                return
            yield sse("complete", {
                "overall_analysis": final_state.get("overall_analysis", ""),
                "sector_analyses": final_state.get("sector_analyses", {}),
                "sector_article_counts": final_state.get("sector_article_counts", {}),
                "sector_articles_meta": final_state.get("sector_articles_meta", {}),
                "timings": final_state.get("timings", {}),
                "run_duration_ms": run_ms,
            })
        except Exception as exc:
            logger.exception("스트리밍 분석 실패")
            yield sse("error", {"message": str(exc)})

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

> `X-Accel-Buffering: no` — 프록시 buffering 방지 (특히 Nginx/Vercel edge).

`X-Service-Secret` 검증은 기존 미들웨어/의존성과 동일하게 적용.

### 검증

```bash
# 호스트에서 ai_service 컨테이너 직격 SSE 요청
docker compose exec -T ai_service python -c "
import asyncio, httpx, json
async def main():
    async with httpx.AsyncClient(timeout=None) as c:
        async with c.stream('POST', 'http://localhost:8001/news/analyze/stream',
            headers={'X-Service-Secret': 'TEST'}, json={'target_date':'2026-05-04','market':'KR'}) as r:
            async for line in r.aiter_lines():
                if line: print(line)
asyncio.run(main())
"
```

흘러내리는 라인이 `event: graph_start`, `event: node_start`, `event: token`, `event: node_done`, `event: complete` 순서로 보여야 한다.

### 완료 기준
- [ ] `/news/analyze/stream` 응답 `Content-Type: text/event-stream`
- [ ] 토큰 이벤트가 섹터별로 분리되어 흐름 (tags로 섹터 식별)
- [ ] 마지막 `complete` payload가 비스트리밍 `/news/analyze` 응답과 동일한 키 셋 + `timings`

### 커밋
```
feat(news): ai_service에 LangGraph astream_events 기반 SSE 엔드포인트 추가
```

---

## 꼭지 3: Django async 스트리밍 프록시 뷰 `POST /api/v1/news/analyses/run-stream/`

### 배경

프론트가 ai_service에 직접 접근하지 않는 보안 원칙 유지. 인증·DB 영속화는 Django 계층에서 처리.

### 작업 A — Async view + StreamingHttpResponse

`backend/apps/news/views.py` 신규 함수 뷰:
```python
import json
from datetime import date
from asgiref.sync import sync_to_async
from django.http import StreamingHttpResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

import httpx

# DRF의 IsAuthenticated를 async에서 쓰기 어렵기 때문에 토큰 수동 검증 패턴 사용
async def _authenticate_async(request) -> "CustomUser":
    auth = JWTAuthentication()
    # JWTAuthentication.authenticate는 sync — sync_to_async로 감싼다
    result = await sync_to_async(auth.authenticate, thread_sensitive=False)(request)
    if not result:
        raise PermissionError("authentication required")
    return result[0]


async def news_analysis_run_stream(request):
    """SSE 프록시: ai_service 스트림을 그대로 통과시키며 complete 시 DB에 저장."""
    if request.method != "POST":
        return StreamingHttpResponse(b"", status=405)
    try:
        user = await _authenticate_async(request)
    except PermissionError:
        return StreamingHttpResponse(b"", status=401)

    body = json.loads(request.body or b"{}")
    target_date = body.get("target_date") or str(date.today())
    market = body.get("market", "KR")

    sectors = await sync_to_async(list)(
        MarketSector.objects.filter(is_active=True, market__in=[market, "ALL"])
        .order_by("display_order")
        .values_list("sector_name_ko", flat=True)
    )

    async def event_stream():
        ai_url = f"{settings.AI_SERVICE_URL}/news/analyze/stream"
        headers = {"X-Service-Secret": settings.AI_SERVICE_SECRET}
        payload = {"target_date": target_date, "market": market, "sectors": sectors}

        # ai_service 스트림을 line 단위로 받아 프론트로 그대로 yield
        # 동시에 'complete' 이벤트 페이로드를 캡처해 DB에 저장
        last_event = None
        buffer_data: list[str] = []
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", ai_url, json=payload, headers=headers) as r:
                async for raw_line in r.aiter_lines():
                    # raw_line 단위로 그대로 통과
                    yield (raw_line + "\n").encode("utf-8")
                    if raw_line.startswith("event: "):
                        last_event = raw_line[len("event: "):].strip()
                        buffer_data = []
                    elif raw_line.startswith("data: "):
                        buffer_data.append(raw_line[len("data: "):])
                    elif raw_line == "":
                        # 프레임 종결
                        if last_event == "complete" and buffer_data:
                            try:
                                payload_obj = json.loads("\n".join(buffer_data))
                                await _persist_async(target_date, market, payload_obj)
                            except Exception:
                                logger.exception("complete 페이로드 저장 실패")
                        last_event = None
                        buffer_data = []
                # SSE 표준상 빈 줄로 끝나야 하므로 한 번 더
                yield b"\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


async def _persist_async(target_date: str, market: str, payload: dict) -> None:
    """complete 페이로드를 NewsAnalysis/NewsSectorAnalysis에 update_or_create."""
    @sync_to_async(thread_sensitive=True)
    def _save():
        analysis_obj, _ = NewsAnalysis.objects.update_or_create(
            analysis_date=target_date,
            market=market,
            engine_type="langgraph",
            defaults={
                "run_status": "COMPLETED",
                "overall_analysis": payload.get("overall_analysis", ""),
                "raw_result": {
                    "sector_analyses": payload.get("sector_analyses", {}),
                    "sector_article_counts": payload.get("sector_article_counts", {}),
                    "sector_articles_meta": payload.get("sector_articles_meta", {}),
                    "timings": payload.get("timings", {}),
                },
                "run_duration_ms": payload.get("run_duration_ms"),
                "error_message": "",
            },
        )
        sector_map = {
            s.sector_name_ko: s
            for s in MarketSector.objects.filter(
                sector_name_ko__in=payload.get("sector_analyses", {}).keys()
            )
        }
        counts = payload.get("sector_article_counts", {})
        for sector_name, analysis_text in payload.get("sector_analyses", {}).items():
            sector_obj = sector_map.get(sector_name)
            if sector_obj:
                NewsSectorAnalysis.objects.update_or_create(
                    analysis=analysis_obj,
                    sector=sector_obj,
                    defaults={
                        "analysis_text": analysis_text,
                        "article_count": counts.get(sector_name, 0),
                    },
                )
    await _save()
```

### 작업 B — URL 등록

`backend/apps/news/urls.py`:
```python
from . import views

urlpatterns = [
    ...
    path("analyses/run-stream/", views.news_analysis_run_stream, name="news-run-stream"),
]
```

### 작업 C — ASGI 서버 확인

`backend/config/asgi.py` 가 ASGI 핸들러를 사용하고 있고 `runserver` 또는 `daphne`/`uvicorn` 으로 띄우는지 확인. Django 5.2 + DRF 환경에서 함수 기반 async view는 별다른 설정 없이 동작. dev compose의 `python manage.py runserver` 가 ASGI를 자동으로 잡아주는지 확인 후 필요 시 `daphne` 또는 `uvicorn` 으로 교체.

### 검증

```bash
# 호스트에서 인증된 SSE 요청 (ACCESS_TOKEN 환경변수 사용)
ACCESS_TOKEN=$(...)
curl -N -X POST http://localhost:8000/api/v1/news/analyses/run-stream/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"market":"KR","target_date":"2026-05-04"}'
```

흘러내리는 SSE 프레임 확인 + 종료 후 DB:
```bash
docker compose exec -T backend python manage.py shell -c "
from apps.news.models import NewsAnalysis
a = NewsAnalysis.objects.filter(market='KR').order_by('-updated_at').first()
print(a.run_status, list(a.raw_result.keys()))
print('timings:', a.raw_result.get('timings'))
"
```

### 완료 기준
- [ ] `POST /api/v1/news/analyses/run-stream/` 가 인증 통과 시 SSE로 응답
- [ ] 비인증 요청은 401
- [ ] `complete` 이벤트 후 `NewsAnalysis` `run_status="COMPLETED"` + `timings` 저장됨
- [ ] `error` 이벤트 또는 upstream 예외 시 stream 종료, 상태 정리

### 커밋
```
feat(news): Django async SSE proxy view + complete 이벤트 시 DB 영속화
```

---

## 꼭지 4: Next.js `/api/v1/[...path]/route.ts` SSE pass-through

### 배경

현재 catch-all이 `await response.json()` 을 가정해 SSE를 통과시키지 못한다.

### 작업

`frontend/src/app/api/v1/[...path]/route.ts`:
```ts
async function proxy(request: NextRequest, ...) {
  // ... 인증 쿠키 → Bearer 헤더 변환 (기존 로직 유지) ...
  const upstream = await fetch(djangoUrl, {
    method: request.method,
    headers: forwardHeaders,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
  });

  const ct = upstream.headers.get("content-type") || "";
  if (ct.startsWith("text/event-stream")) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }
  // 그 외(JSON 등)는 기존 처리 유지
  ...
}
```

`runtime`은 기본 `nodejs` 유지(edge에서 Django 백엔드를 라우팅하기 어려움).

### 검증

브라우저 DevTools → Network → `/api/v1/news/analyses/run-stream/` 응답이 `text/event-stream` 으로 표시되고 chunk가 누적되는지 확인. Pending 상태에서도 응답 본문 탭에 데이터가 들어와야 함.

### 완료 기준
- [ ] SSE 응답은 ReadableStream 그대로 통과
- [ ] JSON 응답은 기존과 동일하게 처리
- [ ] 인증 쿠키 → Bearer 변환 회귀 없음

### 커밋
```
feat(api-proxy): SSE 응답을 통과시키도록 catch-all 라우트 확장
```

---

## 꼭지 5: 프론트 SSE 컨슈머 + UI 타이핑 효과

### 배경

사용자가 실제로 체감할 부분. fetch + ReadableStream + TextDecoder 로 SSE 라인을 파싱하고, 노드/토큰 이벤트를 React 상태에 반영해 카드 단계별 등장 + 카드 안 텍스트 타이핑.

### 작업 A — SSE 파서 (신규)

`frontend/src/lib/sse.ts`:
```ts
// frontend/src/lib/sse.ts
export type SSEEvent<T = unknown> = { event: string; data: T };

export async function* readSSE<T = unknown>(res: Response): AsyncGenerator<SSEEvent<T>> {
  if (!res.body) throw new Error("no response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let frameEnd: number;
    while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) eventName = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
      }
      if (dataLines.length === 0) continue;
      try {
        const data = JSON.parse(dataLines.join("\n")) as T;
        yield { event: eventName, data };
      } catch {
        // 비-JSON 데이터는 무시
      }
    }
  }
}
```

### 작업 B — `NewsBriefingDetail.tsx` 스트리밍 분기

기존 `taskId`/`polling`/`pollCountRef`/`useEffect(폴링)` 분기를 제거(또는 fallback으로 잠시 보존). `handleRegenerate()` 를 SSE 기반으로 교체:

```tsx
const [streamingActive, setStreamingActive] = useState(false);
const [streamSectors, setStreamSectors] = useState<Record<string, {
  text: string;
  status: "pending" | "streaming" | "done";
  elapsed_ms?: number;
  article_count?: number;
}>>({});
const [streamOverall, setStreamOverall] = useState<{
  text: string;
  status: "pending" | "streaming" | "done";
}>({ text: "", status: "pending" });

async function handleRegenerate() {
  if (streamingActive) return;
  const targetDate = analysis?.analysis_date ?? initialDate ?? new Date().toISOString().slice(0, 10);
  if (!window.confirm("뉴스 분석을 다시 실행합니다. 약 1~3분 소요됩니다. 계속할까요?")) return;

  setStreamingActive(true);
  setStreamSectors({});
  setStreamOverall({ text: "", status: "pending" });

  try {
    const res = await fetch("/api/v1/news/analyses/run-stream/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market: "KR", target_date: targetDate }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let lastTokenAt = Date.now();
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastTokenAt > 30_000) {
        addToast("AI 서비스 응답이 지연되고 있습니다", "error");
      }
    }, 5_000);

    try {
      for await (const ev of readSSE<any>(res)) {
        lastTokenAt = Date.now();
        switch (ev.event) {
          case "graph_start": {
            const sectors: string[] = ev.data.sectors || [];
            setStreamSectors(Object.fromEntries(sectors.map(s => [s, { text: "", status: "pending" as const }])));
            break;
          }
          case "search_done": {
            const counts: Record<string, number> = ev.data.sector_article_counts || {};
            setStreamSectors(prev => Object.fromEntries(Object.entries(prev).map(
              ([k, v]) => [k, { ...v, article_count: counts[k] ?? 0 }]
            )));
            break;
          }
          case "node_start": {
            if (ev.data.node === "sector_analyze_node" && ev.data.sector) {
              setStreamSectors(prev => ({ ...prev, [ev.data.sector]: { ...(prev[ev.data.sector] ?? { text: "" }), status: "streaming" } }));
            } else if (ev.data.node === "aggregate_node") {
              setStreamOverall(prev => ({ ...prev, status: "streaming" }));
            }
            break;
          }
          case "token": {
            if (ev.data.scope === "sector" && ev.data.sector) {
              const k = ev.data.sector;
              setStreamSectors(prev => ({ ...prev, [k]: { ...(prev[k] ?? { status: "streaming", text: "" }), text: (prev[k]?.text ?? "") + ev.data.text } }));
            } else if (ev.data.scope === "aggregate") {
              setStreamOverall(prev => ({ ...prev, text: prev.text + ev.data.text, status: "streaming" }));
            }
            break;
          }
          case "node_done": {
            if (ev.data.node === "sector_analyze_node" && ev.data.sector && typeof ev.data.full_text === "string") {
              const k = ev.data.sector;
              setStreamSectors(prev => ({ ...prev, [k]: { ...(prev[k] ?? { text: "" }), text: ev.data.full_text, status: "done", elapsed_ms: ev.data.elapsed_ms } }));
            } else if (ev.data.node === "aggregate_node" && typeof ev.data.full_text === "string") {
              setStreamOverall({ text: ev.data.full_text, status: "done" });
            }
            break;
          }
          case "complete": {
            await loadAnalysis();   // DB에 저장된 정식 객체로 교체
            addToast("분석이 완료되었습니다", "success");
            break;
          }
          case "error": {
            addToast(`분석 실패: ${ev.data.message}`, "error");
            break;
          }
        }
      }
    } finally {
      window.clearInterval(watchdog);
    }
  } catch (err) {
    addToast(err instanceof Error ? err.message : "스트리밍 실패", "error");
  } finally {
    setStreamingActive(false);
  }
}
```

### 작업 C — Streaming 카드 컴포넌트 (신규)

`frontend/src/components/news/StreamingSectorCard.tsx`:
- props: `{ name: string; text: string; status: "pending"|"streaming"|"done"; articleCount?: number; elapsedMs?: number }`
- pending: 점선 카드 + "대기 중…"
- streaming: 점멸 인디케이터 + `SectorMarkdown`(누적 텍스트) + "n초 경과"
- done: 정상 카드 + 누적 텍스트(서버 full_text) + 점멸 인디케이터 제거

`NewsBriefingDetail.tsx` 의 섹터 탭 영역 위쪽에 `streamingActive`이면 6개 `StreamingSectorCard` 그리드 표시. `complete` 후에는 `loadAnalysis()`로 정식 카드로 교체.

### 검증

1. "다시 생성" 클릭 → 1~2초 안에 6개 placeholder 카드 등장
2. 각 섹터 카드 status="streaming" 으로 전환 + 텍스트가 글자 단위로 누적
3. 종합 요약 카드 typing 후 status="done"
4. 마지막에 정식 카드로 교체, 새로고침해도 동일 결과 유지
5. Ollama 다운 시 30초 후 "AI 서비스 응답이 지연되고 있습니다" 토스트

### 완료 기준
- [ ] 새로운 SSE 흐름이 폴링 없이 동작
- [ ] 카드 단계별 등장 + 카드 내 typing UX
- [ ] 스트리밍 종료 후 페이지 새로고침해도 동일 결과 (DB 저장 OK)
- [ ] 30초 무응답 시 watchdog 토스트

### 커밋
```
feat(news): SSE 컨슈머 + 노드/토큰 단위 타이핑 UI
```

---

## 꼭지 6 (옵션): 평균 메트릭 노출

### 배경

`NewsAnalysis.raw_result.timings` 가 데일리·실시간 양쪽 경로에서 누적된다. 이번 세션은 데이터 적재까지만, UI는 다음 세션 후보.

### 작업 (선택)

- `/news` 페이지 푸터 한 줄: "지난 7일 평균 분석 시간 N분 M초" — `NewsAnalysis.objects.filter(updated_at__gte=...).aggregate(Avg('run_duration_ms'))`
- 또는 어드민 변경 리스트에 `run_duration_ms`, `total_ms` 컬럼 추가

### 완료 기준
- [ ] (옵션) 푸터에 평균 시간 노출 또는
- [ ] (옵션) 어드민에서 timing 컬럼 확인 가능

### 커밋
```
feat(news): 분석 평균 시간 노출
```

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/news-streaming-realtime

gh pr create --base dev \
  --title "[feat] 뉴스 분석 노드별 실시간 스트리밍 + timeout/메트릭 강화" \
  --body "..."

gh pr merge <N> --merge --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/news-streaming-realtime" \
  --body "..."

git checkout dev && git pull origin dev
git branch -d feat/news-streaming-realtime
mv prompts/session_27_news_streaming_realtime.md prompts/_complete/
```

---

## 메모: 차후 신경 쓸 점

- **Django dev runserver의 ASGI 호환성** — async view는 ASGI handler를 거쳐야 한다. `runserver` 가 자동으로 잡지 못하면 `uvicorn config.asgi:application` 또는 `daphne` 로 교체 필요.
- **Next.js dev (turbopack)의 SSE buffering** — 응답이 chunk 단위로 안 흘러내리면 `experimental` 옵션이나 prod 빌드로 검증.
- **토큰 누적 텍스트 vs full_text 충돌** — `node_done` 의 `full_text` 가 누적 텍스트와 미세하게 달라질 수 있음(공백/줄바꿈 보정). 마지막 교체 단계에서 깜빡임이 보이면 둘 다 같은 normalize 함수 통과.
- **사용자 백로그 (다음 세션 후보)**:
  - **session_28 — 섹터별 종목 추천 (Topic 2)**: 섹터 분석 텍스트 + Tavily 결과에서 매수 후보 종목 추출
  - **session_29 — 재무지표 시계열 카드 + 차트 (Topic 3)**: DART `fnlttSinglAcntAll` 기반 PER/PBR/PSR/부채비율 시계열
  - **session_30 — 뉴스 분석 평균 메트릭 대시보드** (꼭지 6 본격 화)
