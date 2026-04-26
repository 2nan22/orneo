# Session 23: AI 웹 검색 연동 + DART 종목 선택 + 모델 교체

> **세션 목표**: Decision Studio에 실시간 데이터를 주입하고, DART 연동을 regex → 종목 선택 방식으로 개선한다.
> **예상 소요**: 2~2.5시간
> **브랜치**: `feat/ai-search-dart-ticker` (dev에서 분기)
> **선행 세션**: Session 22 (DART·K-MOOC 완성도) 완료 후 진행

---

## 배경 및 설계 결정

### MCP vs. Tool Calling

MCP(Model Context Protocol)는 Claude API 전용 프로토콜이며 Ollama 로컬 모델은 지원하지 않는다.
대신 **ai_service가 검색 API를 직접 호출 → 결과를 프롬프트에 주입 → LLM 호출** 방식을 채택한다.
Qwen2.5:7b는 Ollama Tool Calling API를 지원하지만, 안정성을 위해 "검색 선행 주입" 패턴을 사용한다.

```
프론트 → ai_service /decision/scenarios
              ↓
         1) Tavily로 관련 뉴스·데이터 검색
              ↓
         2) 검색 결과를 context에 주입
              ↓
         3) Qwen2.5:7b 시나리오 생성
              ↓
         응답 반환
```

### DART 연동 방식 변경

기존: 일지 제목 → regex → 회사명 → DART 조회 (실패율 높음)
변경: 투자 카테고리 일지 작성 시 종목 직접 검색 → `corp_code` 저장 → DART 직접 조회

---

## 꼭지 0: 모델 교체 (gemma4:e2b → qwen2.5:7b)

**파일**: `.env`, `ai_service/config.py`

`gemma4:e2b`는 비전-언어 모델로 텍스트 전용 한국어 구조화 프롬프트에서 빈 응답을 반환하는 문제가 있다.
`qwen2.5:7b`는 동일 머신에 설치되어 있으며 한국어 구조화 출력을 정상 처리한다.

```bash
# .env
GEMMA_MODEL=qwen2.5:7b
```

```python
# ai_service/config.py — gemma_model 필드 기본값 변경
gemma_model: str = "qwen2.5:7b"
```

컨테이너 재시작 후 Decision Studio 실제 AI 응답 확인.

**완료 기준**
- [ ] Decision Studio 시나리오가 일지 내용에 맞게 다르게 생성됨 (hardcoded 문구 아님)

**커밋**
```
fix(ai_service): gemma4:e2b → qwen2.5:7b 모델 교체 (빈 응답 버그)
```

---

## 꼭지 1: Tavily 웹 검색 연동 (ai_service)

**파일**: `ai_service/services/search.py` (신규)
**파일**: `ai_service/services/gemma_client.py`
**파일**: `ai_service/config.py`
**파일**: `ai_service/requirements.txt`

### 1-1. Tavily API 설정

Tavily는 AI용으로 최적화된 검색 API. 무료 티어 월 1,000회.
가입: https://tavily.com

```bash
# .env
TAVILY_API_KEY=tvly-...

# .env.example
TAVILY_API_KEY=        # Tavily 웹 검색 API 키 (https://tavily.com 무료 가입)
```

```python
# ai_service/config.py
tavily_api_key: str = ""   # 빈 값이면 검색 생략 (fallback graceful)
```

```
# ai_service/requirements.txt 추가
tavily-python>=0.5.0
```

### 1-2. SearchService 구현

```python
# ai_service/services/search.py
"""웹 검색 서비스 — Tavily API 기반."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

MAX_RESULTS = 3
MAX_CONTENT_LEN = 300  # 검색 결과 1건당 최대 문자 수


async def search_recent_news(query: str, *, api_key: str) -> list[str]:
    """Tavily로 최신 뉴스를 검색하고 요약 텍스트 목록을 반환한다.

    Args:
        query: 검색 쿼리 (예: "삼성전자 주가 최근 뉴스").
        api_key: Tavily API 키.

    Returns:
        검색 결과 요약 문자열 목록. API 키 미설정 또는 실패 시 빈 리스트.
    """
    if not api_key:
        return []

    try:
        from tavily import AsyncTavilyClient  # 지연 임포트 — API 키 없으면 미호출
        client = AsyncTavilyClient(api_key=api_key)
        response = await client.search(
            query=query,
            search_depth="basic",
            max_results=MAX_RESULTS,
            include_answer=False,
        )
        snippets = []
        for r in response.get("results", []):
            title = r.get("title", "")
            content = r.get("content", "")[:MAX_CONTENT_LEN]
            url = r.get("url", "")
            snippets.append(f"[{title}] {content} (출처: {url})")
        logger.info("[Tavily] 검색 완료: query=%s count=%d", query, len(snippets))
        return snippets
    except Exception as exc:
        logger.warning("[Tavily] 검색 실패, 생략: %s", exc)
        return []
```

### 1-3. gemma_client.py — 시나리오 생성 시 검색 주입

`generate_scenarios` 메서드에 검색 결과 주입 추가:

```python
# ai_service/services/gemma_client.py
async def generate_scenarios(
    self,
    topic: str,
    context: dict,
    *,
    tavily_api_key: str = "",          # 추가
) -> ScenariosResult:
    # 검색어 구성: 주제 + 카테고리 기반
    query = self._build_search_query(topic, context.get("category", ""))
    search_snippets = await search_recent_news(query, api_key=tavily_api_key)

    prompt = self._build_scenarios_prompt(topic, context, search_snippets)
    ...
```

`_build_scenarios_prompt`에 `[최신 정보]` 섹션 추가:

```python
def _build_scenarios_prompt(self, topic: str, context: dict, search_snippets: list[str]) -> str:
    ...
    snippets_str = "\n".join(f"- {s}" for s in search_snippets) or "검색 결과 없음"
    return f"""...
[최신 참고 정보 (웹 검색)]
{snippets_str}
...형식 동일..."""
```

검색어 생성 헬퍼:
```python
CATEGORY_SEARCH_SUFFIX = {
    "investment": "주가 최근 뉴스 실적",
    "housing": "부동산 시세 최근 뉴스",
    "learning": "강좌 추천 커리어",
    "routine": "루틴 생산성",
    "general": "최신 트렌드",
}

def _build_search_query(self, topic: str, category: str) -> str:
    suffix = CATEGORY_SEARCH_SUFFIX.get(category, "")
    return f"{topic} {suffix}".strip()
```

### 1-4. 라우터에서 api_key 전달

```python
# ai_service/routers/decision.py
from config import settings

result = await client.generate_scenarios(
    topic=request.topic,
    context=request.context.model_dump(),
    tavily_api_key=settings.tavily_api_key,   # 추가
)
```

**완료 기준**
- [ ] TAVILY_API_KEY 설정 시 시나리오에 검색 결과 기반 설명 포함
- [ ] API_KEY 미설정 시 기존과 동일하게 동작 (graceful)
- [ ] 로그에 `[Tavily] 검색 완료: query=...` 출력 확인

**커밋**
```
feat(ai_service): Tavily 웹 검색 연동 — 시나리오 생성 시 실시간 데이터 주입
```

---

## 꼭지 2: DART 종목 직접 선택 — 백엔드

**파일**: `backend/apps/journal/models.py`
**파일**: `backend/apps/journal/serializers.py`
**파일**: `backend/apps/journal/migrations/`

### 2-1. JournalEntry 모델에 종목 필드 추가

```python
# backend/apps/journal/models.py
class JournalEntry(models.Model):
    ...
    # 투자 카테고리 전용 — 직접 선택한 종목 정보
    dart_corp_code = models.CharField(max_length=8, blank=True, default="")
    dart_corp_name = models.CharField(max_length=100, blank=True, default="")
```

마이그레이션 생성:
```bash
./dc.sh dev makemigrations journal
./dc.sh dev migrate
```

### 2-2. Serializer 업데이트

```python
# backend/apps/journal/serializers.py
class JournalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = [
            "category", "title", "content", "mood_score",
            "dart_corp_code", "dart_corp_name",   # 추가
        ]

class JournalResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = [
            "id", "category", "title", "content",
            "dart_corp_code", "dart_corp_name",    # 추가
            "ai_summary", "is_reviewed", "mood_score", "created_at",
        ]
        read_only_fields = [
            "id", "ai_summary", "is_reviewed", "created_at"
        ]
```

### 2-3. DART 종목 검색 엔드포인트 (ai_service)

**파일**: `ai_service/routers/public_data.py`

```python
@router.get("/dart/corps", summary="DART 기업 검색")
async def search_dart_corps(
    keyword: str = Query(..., description="회사명 검색어 (예: 삼성)"),
) -> dict:
    """DART에서 기업명으로 회사 목록을 검색한다."""
    # DART company.json은 정확한 이름이 필요하므로,
    # DART 기업 코드 전체 목록 XML을 캐시해서 로컬 검색하는 방식이 정확함.
    # MVP: company.json으로 직접 조회
    ...
```

> **참고**: DART 기업 코드 전체 목록은 `https://opendart.fss.or.kr/api/corpCode.xml` (ZIP)을 다운로드해서
> 로컬 캐시 후 검색하는 게 가장 정확하다. MVP는 회사명 직접 입력 → DART company.json 조회로 시작.

**완료 기준**
- [ ] `dart_corp_code`, `dart_corp_name` 필드 마이그레이션 적용 확인
- [ ] JournalCreateSerializer에 두 필드 포함 확인

**커밋**
```
feat(backend): JournalEntry에 DART 종목 필드 추가 (dart_corp_code, dart_corp_name)
```

---

## 꼭지 3: DART 종목 선택 — 프론트엔드

**파일**: `frontend/src/components/journal/JournalCreateModal.tsx` (또는 NewJournalPage)
**파일**: `frontend/src/components/journal/DartCorpSearchInput.tsx` (신규)
**파일**: `frontend/src/components/journal/DartDisclosureBadge.tsx`
**파일**: `frontend/src/lib/types.ts`

### 3-1. JournalEntry 타입 업데이트

```ts
// frontend/src/lib/types.ts
export interface JournalEntry {
  ...
  dart_corp_code: string;
  dart_corp_name: string;
}
```

### 3-2. DartCorpSearchInput 컴포넌트

투자 카테고리 선택 시 나타나는 종목 검색 입력:

```tsx
// frontend/src/components/journal/DartCorpSearchInput.tsx
"use client";
interface Corp { corp_code: string; corp_name: string }
interface Props {
  value: Corp | null;
  onChange: (corp: Corp | null) => void;
}

export default function DartCorpSearchInput({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Corp[]>([]);

  // query 입력 시 /api/public-data/dart/corps?keyword= 호출
  // 결과 드롭다운 표시 → 선택 시 onChange 호출
  ...
}
```

Next.js 프록시 라우트:
```ts
// frontend/src/app/api/public-data/dart/corps/route.ts
// ai_service /public-data/dart/corps?keyword= 프록시
```

### 3-3. 일지 생성 폼에 DartCorpSearchInput 추가

`investment` 카테고리 선택 시 조건부 렌더:

```tsx
{category === "investment" && (
  <div>
    <label className="text-sm font-medium">종목 (선택)</label>
    <DartCorpSearchInput
      value={selectedCorp}
      onChange={setSelectedCorp}
    />
  </div>
)}
```

일지 생성 payload에 포함:
```ts
dart_corp_code: selectedCorp?.corp_code ?? "",
dart_corp_name: selectedCorp?.corp_name ?? "",
```

### 3-4. DartDisclosureBadge — corp_code 직접 사용

```tsx
// DartDisclosureBadge.tsx
// 기존: extractCorpName(title) → regex → DART 검색
// 변경: dart_corp_code가 있으면 직접 사용, 없으면 regex fallback

interface Props {
  title: string;
  category: string;
  dart_corp_code?: string;  // 추가
  dart_corp_name?: string;  // 추가
}

// useEffect: dart_corp_code 있으면 ?corp_code= 파라미터로 조회
//            없으면 기존 corp_name 검색 (fallback)
```

DART Next.js 프록시도 `corp_code` 파라미터 지원 추가:
```ts
// /api/public-data/dart/route.ts
const corp_code = req.nextUrl.searchParams.get("corp_code") ?? "";
const corp_name = req.nextUrl.searchParams.get("corp_name") ?? "";
// corp_code 있으면 ai_service에 corp_code로 직접 조회
```

ai_service DART 엔드포인트도 `corp_code` 직접 조회 지원:
```python
# /public-data/dart/disclosures
# corp_code 파라미터 추가 → _fetch_corp_code 단계 건너뜀
```

**완료 기준**
- [ ] 투자 일지 작성 시 종목 검색 UI 표시
- [ ] 종목 선택 후 일지 생성 → DartDisclosureBadge에 해당 종목 공시 표시
- [ ] 종목 미선택 시 기존 regex fallback 동작

**커밋**
```
feat(frontend): DART 종목 직접 선택 UI — 일지 생성 시 corp_code 저장
```

---

## 꼭지 4: K-MOOC 키워드 추출 개선

**파일**: `frontend/src/components/goals/GoalCard.tsx`

현재: 목표 제목 전체를 키워드로 넘김 → "K-MOOC 금융 과정 수료" 같은 긴 문장 → 검색 실패
개선: 목표 제목에서 핵심 명사 추출 (간단한 전처리)

```tsx
// frontend/src/components/goals/GoalCard.tsx

function extractKeyword(title: string): string {
  // 불용어 제거 후 핵심 단어 추출
  const stopwords = ["과정", "수료", "달성", "준비", "목표", "계획", "공부", "학습", "완료", "하기"];
  const words = title.split(/[\s·,]+/);
  const keywords = words.filter(w => w.length >= 2 && !stopwords.includes(w));
  return keywords.slice(0, 2).join(" ") || title;
}

// GoalCard에서
{goal.category === "learning" && (
  <CourseSuggestionCard keyword={extractKeyword(goal.title)} />
)}
```

예시:
- "K-MOOC 금융 과정 수료" → "금융" (2글자 이상, 불용어 제거)
- "부동산 투자 공부" → "부동산 투자"
- "Python 데이터분석" → "Python 데이터분석"

**완료 기준**
- [ ] "부동산" 키워드로 K-MOOC 강좌 1개 이상 조회 확인
- [ ] "금융" 키워드로 강좌 조회 확인

**커밋**
```
fix(frontend): K-MOOC 검색 키워드 추출 개선 (불용어 제거)
```

---

## 세션 완료 후

```bash
cd frontend && npx tsc --noEmit && npm run build

git push origin feat/ai-search-dart-ticker

gh pr create \
  --base dev \
  --title "[feat] AI 웹 검색 연동 + DART 종목 선택 + 모델 교체" \
  --body "$(cat <<'EOF'
## 개요
Decision Studio에 실시간 데이터를 주입하고, DART 연동을 regex → 종목 선택 방식으로 개선한다.

## 변경 사항
- [ ] qwen2.5:7b 모델 교체 (gemma4:e2b 빈 응답 버그)
- [ ] Tavily 웹 검색 → 시나리오 생성 시 실시간 데이터 주입
- [ ] DART 종목 직접 선택 (투자 일지 작성 시 corp_code 저장)
- [ ] K-MOOC 키워드 추출 개선

## 테스트
- [ ] Decision Studio 시나리오가 일지 내용에 맞게 생성됨
- [ ] TAVILY_API_KEY 설정 시 검색 결과 포함 확인
- [ ] 투자 일지 종목 선택 → DART 공시 배지 정상 표시
- [ ] K-MOOC 강좌 조회 성공
- [ ] npx tsc --noEmit + npm run build 통과

## 체크리스트
- [ ] TypeScript 타입 에러 없음
- [ ] TAVILY_API_KEY 미설정 시 graceful 동작
- [ ] 투자 참고용 고지 유지
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/ai-search-dart-ticker" \
  --body "$(cat <<'EOF'
[feat] AI 웹 검색 연동 + DART 종목 선택 + 모델 교체

- gemma4:e2b → qwen2.5:7b (한국어 구조화 응답 버그 수정)
- Tavily 웹 검색 → Decision Studio 시나리오에 실시간 데이터 주입
- 투자 일지 작성 시 DART 종목 직접 선택 (corp_code 저장)
- K-MOOC 키워드 추출 개선 (불용어 제거)
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/ai-search-dart-ticker

mv prompts/session_23_ai_search_dart_ticker.md prompts/_complete/
```

---

## 참고: Tavily 가입 및 키 발급

1. https://tavily.com 접속 → Sign Up
2. Dashboard → API Keys → Create Key
3. `.env`에 `TAVILY_API_KEY=tvly-...` 입력
4. 무료 티어: 월 1,000회 (개발 용도로 충분)

## 참고: DART 기업 코드 전체 목록 (향후 개선)

`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=...` 로 ZIP 다운로드 → 압축 해제 → XML 파싱 → DB/캐시 저장.
이렇게 하면 부분 매칭 검색이 가능해짐. 이번 세션은 MVP로 직접 입력 방식.

---

*작성일: 2026-04-26*
