# Session 25: 공공데이터 API 복구 (MOLIT 6종 + DART 502) + 뉴스 UI 설계·구현

> **세션 목표**: 새 맥북 셋업 이후 회귀된 공공데이터 API를 복구하고, Session 24에서 만든 뉴스 분석 데이터를 UI로 노출한다.
> **예상 소요**: 3 ~ 4시간 (꼭지 1·2: 디버깅·복구 1.5h, 꼭지 3: 뉴스 UI 설계·구현 2h)
> **브랜치**: `feat/publicdata-fix-news-ui` (dev에서 분기)
> **선행 세션**: Session 24 (뉴스 분석 통합 PoC) 완료
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
# 기존 공공데이터 라우터·서비스
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/routers/public_data.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/public_data/molit.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/public_data/dart.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/config.py

# 프론트 라우트
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/app/api/public-data/apartments/route.ts
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/app/api/public-data/dart/route.ts

# 대시보드 하단 UI (실거래가/공시 카드)
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/dashboard/ApartmentCard.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/dashboard/DartCard.tsx

# 뉴스 모델 (Session 24에서 신설)
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/models.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/views.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/urls.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/routers/news.py
```

---

## 꼭지 1: MOLIT 실거래가 — 6종 라우팅 복구 + 401 에러 원인 분석

### 배경

- **회귀 1 (라우팅)**: 프론트(`apartments/route.ts`)는 `type` 파라미터로 `apt|offi|rh|sh|...` 5종을 SERVICE_MAP에 매핑하는데, ai_service 라우터는 항상 `settings.molit_apt_trade_detail_endpoint`(아파트 매매 상세) 하나만 호출한다. 즉 type을 무시하고 있어서 대시보드 하단 UI에서 다른 유형은 결과가 안 나온다.
- **회귀 2 (401)**: API 키 입력 후에도 `MOLIT API 오류: 401`. 새 맥북에서 발급받은 키가 (a) 활용신청 미승인 상태이거나, (b) URL-인코딩이 이미 된 키를 또 인코딩해서 깨졌거나, (c) `serviceKey` 쿼리 파라미터로 보내야 하는데 헤더로 보내고 있을 가능성.

### 작업 A — 401 에러 원인 격리

```bash
# 1) 키가 raw 인지 URL-encoded 인지 확인
grep DATA_GO_KR_SERVICE_KEY .env
# 키 끝이 %3D%3D 로 끝나면 URL-encoded, == 로 끝나면 raw

# 2) ai_service/services/public_data/molit.py 의 serviceKey 전달 방식 확인
#    httpx 가 자동으로 URL 인코딩 → 이미 인코딩된 키는 더블 인코딩됨
#    → params dict에 raw 키를 넣거나, 이미 인코딩된 키면 url 문자열에 직접 박아야 함

# 3) curl로 직접 호출해서 백엔드 가공 없이 401 재현
curl -sG "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev" \
  --data-urlencode "serviceKey=원본키" \
  --data "LAWD_CD=11110&DEAL_YMD=202604&pageNo=1&numOfRows=10"
```

### 작업 B — `ai_service/services/public_data/molit.py` 수정

- 키 처리: `httpx.AsyncClient`의 `params=` dict를 사용하면 자동 인코딩되므로 **raw 키를 사용**한다. 이미 인코딩된 키가 들어오면 `urllib.parse.unquote` 한 번 적용 후 전달.
- `MolitClient`에 `endpoint_path: str` 파라미터를 추가해 6종 엔드포인트를 모두 지원하도록 일반화. (현재는 `endpoint`가 아파트 상세 고정)

### 작업 C — `ai_service/routers/public_data.py` 수정

- `/public-data/apartments` 엔드포인트에 `type: str = "apt"` 쿼리 파라미터 추가
- type → settings.molit_*_endpoint 매핑 dict로 분기

```python
MOLIT_ENDPOINT_MAP = {
    "apt":  settings.molit_apt_trade_detail_endpoint,
    "apt_basic": settings.molit_apt_trade_endpoint,
    "rent": settings.molit_apt_rent_endpoint,
    "rh":   settings.molit_row_house_trade_endpoint,
    "sh":   settings.molit_detached_house_trade_endpoint,
    "offi": settings.molit_officetel_trade_endpoint,
}
```

### 작업 D — 응답 필드 매핑

각 엔드포인트의 응답 필드명이 다르다 (이미 프론트 `apartments/route.ts:103` 주석에 메모되어 있음):
- 아파트: `aptNm`
- 오피스텔: `offiNm`
- 연립다세대: `mhouseNm`
- 단독/다가구: `houseType`

`MolitClient` 또는 라우터에서 type별로 정규화한 `apartment_name` 키로 통일해 반환.

### 완료 기준
- [ ] 대시보드 ApartmentCard 에서 5종 type 토글 시 모두 결과 표시
- [ ] 401 에러 사라짐 (`docker compose logs ai_service` 클린)
- [ ] curl 직접 호출과 동일한 데이터가 프론트에 도달

### 커밋
```
fix(public-data): MOLIT 6종 엔드포인트 라우팅 복구 + 401 키 인코딩 버그 수정
```

---

## 꼭지 2: DART 공시 검색 502 디버깅

### 증상 (사용자 콘솔 로그)

```
api/public-data/apartments?lawd_cd=11110&deal_ymd=202604&type=apt → 502
api/public-data/apartments?lawd_cd=11110&deal_ymd=202604&type=offi → 502
```

> 사용자는 "DART 공시 검색"이라 했는데 실제 502는 apartments 엔드포인트에서 발생. DART 검색 화면에서 ApartmentCard도 함께 마운트되어 502가 같이 뜨거나, apartments fetch 실패가 DART UI까지 영향 주는 케이스로 추정. 두 라우트 모두 점검한다.

### 작업 A — 502 발생 위치 격리

```bash
# 1) Next.js 라우트(api/public-data/apartments) 내부에서 ai_service 호출 실패인지,
#    ai_service 가 죽었는지 구분
docker compose logs frontend --tail=50 | grep -E "502|fetch|error"
docker compose logs ai_service --tail=50 | grep -E "ERROR|500|exception"

# 2) ai_service 직접 호출
curl -i http://localhost:8001/public-data/dart/disclosures?keyword=삼성전자
curl -i http://localhost:8001/public-data/apartments?lawd_cd=11110&deal_ymd=202604
```

### 작업 B — 가설별 점검

1. **꼭지 1과 동일 원인 (MOLIT 401)** → ai_service 가 401 받고 예외 던져 502로 노출. 꼭지 1 수정 시 자연스럽게 해소될 가능성.
2. **DART 키 미입력**: `.env` 의 `DART_API_KEY=` 빈값. → `ai_service/routers/public_data.py:110, 155` 의 명시적 401/400 응답을 502 가 아닌 의미있는 에러로 프론트에 전달.
3. **검색 결과 사라짐 (잠깐 나왔다가 사라짐)**: React state race — fetch 결과 도착 전에 setState clear 되는 패턴. `DartCard.tsx` 의 useEffect 의존성 / AbortController 점검.

### 작업 C — 프론트 에러 핸들링 개선

- `frontend/src/app/api/public-data/dart/route.ts` 가 ai_service 502 받았을 때 `{ status: "error", message: "..." }` 형태로 정규화해서 반환
- DartCard 가 에러 상태일 때 "검색 결과 없음"이 아니라 "API 키 미설정" / "서비스 오류" 메시지 표시

### 완료 기준
- [ ] 502 → 200 복구 또는 의미있는 에러 메시지로 변환
- [ ] DART 검색 결과 화면에 안정적으로 표시 (사라짐 현상 해소)

### 커밋
```
fix(public-data): DART 502 디버깅 + 에러 응답 정규화로 UI 안정화
```

---

## 꼭지 3: 뉴스 분석 UI 설계 + 구현

### 배경

Session 24에서 백엔드 파이프라인은 완성됨:
- `TBL_NEWS_ANALYSIS` (분석 헤더, 일별 1행)
- `TBL_NEWS_SECTOR_ANALYSIS` (섹터별 분석 텍스트, ## Summary / ## Key Signals / ## Risk Factors 마크다운)
- Celery Beat 매일 08:00 KST 자동 실행
- Django REST: `GET /api/v1/news/analyses/` (목록), `GET /api/v1/news/analyses/<pk>/` (상세)

이 데이터를 UI로 노출. **사용자 요구사항: 자동 생성 + 수동 트리거 둘 다 지원.**

### 3-1. UX 설계 (작업 시작 전 합의)

#### 진입점 후보 (택 1)

| 옵션 | 위치 | 장점 | 단점 |
|------|------|------|------|
| A | 대시보드 상단 신규 카드 (`NewsBriefingCard`) | 매일 자동 노출, 자연스러운 회귀 | 대시보드 1행이 더 길어짐 |
| B | 좌측 nav 신규 메뉴 `/news` | 독립 화면, 깊이 있는 UI | 사용자가 클릭해야 도달 |
| C | A + B 조합 | 카드는 요약 + 클릭 시 상세 페이지 이동 | 구현 분량 ↑ |

> **권장: C**. 카드는 `overall_analysis` 첫 2~3문장 + 섹터 6개 칩 미리보기. 클릭 시 `/news/[date]` 상세.

#### 상세 화면 구조 (`/news/[date]`)

```
┌───────────────────────────────────────────────────┐
│  📰 2026-05-04 KR 시장 브리핑                       │
│  [날짜 셀렉터 ◀ 2026-05-04 ▶]  [🔄 다시 생성]      │
├───────────────────────────────────────────────────┤
│  [종합 요약]                                       │
│  3-5문장 overall_analysis                          │
├───────────────────────────────────────────────────┤
│  [섹터 탭] 반도체 | AI | 조선 | 원자재 | 에너지 | 금융│
├───────────────────────────────────────────────────┤
│  ## Summary                                        │
│  ...                                               │
│  ## Key Signals                                    │
│  ...                                               │
│  ## Risk Factors                                   │
│  ...                                               │
└───────────────────────────────────────────────────┘
```

#### 수동 생성 UX

- 우측 상단 "🔄 다시 생성" 버튼
- 클릭 시 confirm modal: "오늘자 분석을 다시 실행합니다 (약 30초~1분 소요)"
- 진행 중: 토스트 + 버튼 disabled + spinner
- 완료 시 화면 자동 새로고침

### 3-2. 백엔드 — 수동 트리거 엔드포인트

**파일**: `backend/apps/news/views.py`, `backend/apps/news/urls.py`

```python
# views.py
class NewsAnalysisRunView(APIView):
    """수동으로 뉴스 분석을 실행한다 (Celery에 enqueue)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        market = request.data.get("market", "KR")
        target_date = request.data.get("target_date") or str(date.today())
        # apply_async 로 비동기 큐잉, task_id 반환
        from apps.news.tasks import run_daily_news_analysis
        task = run_daily_news_analysis.apply_async(
            kwargs={"target_date": target_date, "market": market},
        )
        return Response({"task_id": task.id, "status": "queued"})


class NewsAnalysisLatestView(generics.RetrieveAPIView):
    """오늘자 (또는 가장 최근) 분석 결과를 반환한다."""
    serializer_class = NewsAnalysisSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        market = self.request.query_params.get("market", "KR")
        return NewsAnalysis.objects.filter(market=market, run_status="COMPLETED").order_by("-analysis_date").first()
```

```python
# urls.py
path("analyses/run/", views.NewsAnalysisRunView.as_view(), name="news-analysis-run"),
path("analyses/latest/", views.NewsAnalysisLatestView.as_view(), name="news-analysis-latest"),
```

### 3-3. 프론트엔드 — 카드 + 상세 페이지

**파일**:
- `frontend/src/components/dashboard/NewsBriefingCard.tsx` (신규)
- `frontend/src/app/(app)/news/[date]/page.tsx` (신규)
- `frontend/src/app/api/news/route.ts` (신규 — Django 프록시)
- `frontend/src/app/api/news/run/route.ts` (신규 — 수동 트리거 프록시)

#### 카드 컴포넌트 골격

```tsx
// NewsBriefingCard.tsx
"use client";
import useSWR from "swr";
import Link from "next/link";

export function NewsBriefingCard() {
  const { data } = useSWR("/api/news/latest", fetcher);
  if (!data) return <CardSkeleton />;
  return (
    <Link href={`/news/${data.analysis_date}`}>
      <article className="...">
        <header>
          <h3>📰 오늘의 시장 브리핑 ({data.analysis_date})</h3>
        </header>
        <p>{data.overall_analysis.slice(0, 200)}…</p>
        <ul className="flex gap-2">
          {data.sector_analyses.map(s => <li key={s.id}>{s.sector_name_ko}</li>)}
        </ul>
      </article>
    </Link>
  );
}
```

#### 상세 페이지

- 마크다운 렌더링: `react-markdown` + `remark-gfm` 사용 (이미 설치되어 있을 것 — 없으면 추가)
- 섹터 탭 전환: `useState`로 충분 (URL 쿼리는 선택)
- 수동 트리거: `POST /api/news/run` → 토스트 → polling 또는 SWR mutate

### 3-4. 폴링 vs WebSocket

수동 트리거 후 완료 대기는 두 가지 옵션:

| 방식 | 장점 | 단점 |
|------|------|------|
| 폴링 (3초 간격, 최대 60회) | 구현 단순, 기존 인프라로 충분 | 서버 부하 약간 |
| Django Channels + WebSocket | 실시간, 우아함 | 신규 의존성, Redis 채널 레이어 추가 |

> **권장: 폴링**. 1분 이내 작업이므로 폴링이 적정. WebSocket 도입은 별도 세션.

### 완료 기준

- [ ] 대시보드에 NewsBriefingCard 표시 (오늘자 또는 가장 최근 분석)
- [ ] `/news/[date]` 상세 페이지에서 섹터 탭 전환 동작
- [ ] "다시 생성" 버튼 → 비동기 실행 → 완료 시 화면 갱신
- [ ] 분석 데이터가 없을 때 "아직 생성된 브리핑이 없습니다 + [생성하기] 버튼" 표시
- [ ] 모바일 반응형 (섹터 탭이 가로 스크롤로 변환)

### 커밋

```
feat(news): add NewsAnalysisRunView + LatestView for manual trigger
feat(news): NewsBriefingCard on dashboard + /news/[date] detail page
feat(news): manual re-generate flow with task polling
```

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/publicdata-fix-news-ui

gh pr create \
  --base dev \
  --title "[feat] 공공데이터 회귀 복구 + 뉴스 UI" \
  --body "$(cat <<'EOF'
## 개요
새 맥북 셋업 이후 회귀된 공공데이터 API(MOLIT 6종 + DART)를 복구하고, Session 24의 뉴스 분석 데이터를 대시보드 + 상세 페이지로 노출.

## 변경 사항
- [x] MOLIT 6종 엔드포인트 type 라우팅 복구
- [x] MOLIT 401 키 인코딩 버그 수정
- [x] DART 502 에러 원인 분석 + 응답 정규화
- [x] NewsBriefingCard (대시보드) + /news/[date] 상세 페이지
- [x] 수동 재생성 트리거 엔드포인트 + 폴링 UI

## 테스트
- [ ] ApartmentCard 5종 type 모두 데이터 노출
- [ ] DART 검색 결과 안정적 표시
- [ ] 뉴스 카드 클릭 → 상세 → 다시생성 플로우
EOF
)"

gh pr merge <N> --merge --delete-branch \
  --subject "..." --body "..."

git checkout dev && git pull origin dev
git branch -d feat/publicdata-fix-news-ui
mv prompts/session_25_publicdata_fix_news_ui.md prompts/_complete/
```

---

## 다음 세션 후보

- session_26: 뉴스 분석에 사용자 워치리스트(`TBL_USER_WATCHLIST`) 연동 — 관심 섹터/종목만 분석, 푸시 알림
- session_26: WebSocket 도입 (수동 분석 실시간 진행률 표시) + Celery progress 보고
- session_26: 영문(`market=US`) 분석 + 양 시장 비교 카드
