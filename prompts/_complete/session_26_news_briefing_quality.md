# Session 26: 뉴스 브리핑 품질 개선 (포맷 통일 + article_count 복구 + 마크다운 렌더링)

> **세션 목표**: Session 25에서 만든 뉴스 브리핑이 노출은 되지만 품질이 낮음 — 섹터마다 보고서 양식이 다르고, 섹터 칩 옆 카운트가 모두 0, 마크다운이 빈약하게 렌더된다. 이 세션에서 셋을 함께 정리해 다음 세션의 "섹터별 종목 추천"이 올라탈 안정된 베이스를 만든다.
> **예상 소요**: 3 ~ 4시간
> **브랜치**: `feat/news-briefing-quality` (dev에서 분기)
> **선행 세션**: Session 25 (공공데이터 회귀 복구 + 뉴스 UI) 완료
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
# AI 분석 파이프라인
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/services/news_graph.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/routers/news.py

# 백엔드 태스크·시리얼라이저 (article_count 흐름)
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/tasks.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/serializers.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/news/models.py

# 프론트 렌더링
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/NewsBriefingDetail.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/dashboard/NewsBriefingCard.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/package.json
```

---

## 꼭지 1: LLM 프롬프트 강화 — 섹터 보고서 포맷 통일

### 배경 (현 상태)

`ai_service/services/news_graph.py:88-109` 의 `sector_analyze_node` 프롬프트가 한 줄짜리 user 메시지로만 구성돼 섹터마다 출력 양식이 들쭉날쭉하다. 사용자가 보고한 실제 출력 예시:

```
# [반도체] 섹터 2026-05-04 금융 분석 보고서
**작성 목적:** ...
## 💡 Summary (요약)
...
```

다른 섹터는 `## Summary` 만 있거나, 추가로 `## Outlook` 섹션을 만들어 내거나, 이모지가 붙는 등 **출력 스키마가 깨져** 프론트의 `## 헤더` 분할 렌더링과 맞지 않는다.

### 작업 A — `_make_llm()`에 system 메시지 도입

```python
# news_graph.py
SECTOR_ANALYZE_SYSTEM = """\
너는 한국·미국 시장의 섹터 애널리스트다. 사용자가 제공한 뉴스 기사 모음을 읽고
다음 규칙을 엄격히 지켜 보고서를 한국어로 작성한다.

규칙:
1. 출력은 정확히 세 섹션으로 구성한다. 헤더는 `## Summary`, `## Key Signals`,
   `## Risk Factors`. 다른 헤더·이모지·머리말·맺음말을 절대 추가하지 않는다.
2. 각 섹션은 2~4문장의 짧은 단락 1개 또는 3~5개의 불릿 리스트(`- `)로 한정한다.
3. 수치·종목명·날짜는 기사 본문에 등장한 것만 인용한다. 추측·미확인 사실 금지.
4. 마지막 줄은 빈 줄 없이 끝낸다. 코드 펜스를 사용하지 않는다.
5. 기사가 0건이면 세 섹션 모두 "수집된 기사가 없어 분석을 생성할 수 없습니다." 한 줄로 채운다.
"""
```

`sector_analyze_node` 안에서 `SystemMessage(content=SECTOR_ANALYZE_SYSTEM)` + `HumanMessage(...)` 두 메시지로 LLM에 전달한다.

### 작업 B — `aggregate_node` 프롬프트도 동일 패턴으로 강화

종합 요약은 4~6문장 단락 1개로 고정 (헤더·불릿 없이). system 메시지로 분리.

### 작업 C — fallback 텍스트도 새 스키마 따르도록 정리

`sector_analyze_node`의 except 분기에서 만들어 내는 fallback 문자열을 `## Summary / ## Key Signals / ## Risk Factors` 정확히 3섹션 + 각 1줄로 통일.

### 검증 방법

```bash
# 분석 강제 재실행 → DB 결과를 Django shell로 들여다보기
docker compose exec -T backend python manage.py shell -c "
from apps.news.models import NewsAnalysis
a = NewsAnalysis.objects.filter(market='KR').order_by('-analysis_date').first()
for sa in a.sector_analyses.all():
    print('===', sa.sector.sector_name_ko, '===')
    print(sa.analysis_text[:400])
    print()
"
```

모든 섹터 출력이 `## Summary` 로 시작하고 동일한 3섹션 구조여야 한다.

### 완료 기준
- [ ] 6개 섹터 전부 `## Summary / ## Key Signals / ## Risk Factors` 정확히 3섹션
- [ ] 이모지·코드펜스·다른 헤더 없음
- [ ] 종합 요약은 단락 1개

### 커밋
```
feat(news): system 프롬프트로 섹터·종합 보고서 출력 스키마 통일
```

---

## 꼭지 2: `article_count` 항상 0 버그 — 카운트 전달 경로 복구

### 배경

`backend/apps/news/models.py:113` 의 `NewsSectorAnalysis.article_count` 가 늘 0이다. 추적 결과:

1. `news_graph.multi_search_node` 는 `sector_articles[sector] = [...]` 길이 정보를 만든다.
2. 하지만 `aggregate_node`까지 통과해 라우터가 반환할 때 응답 스키마(`NewsAnalyzeResponse`)에는 `sector_analyses: dict[str, str]` 만 포함되고 카운트는 **빠진다**.
3. 그 결과 `backend/apps/news/tasks.py:75-82` 의 `update_or_create` 가 `defaults={"analysis_text": ...}` 만 채우고 `article_count` 는 모델 default(0)으로 남는다.

### 작업 A — `ai_service` 응답에 카운트 추가

`ai_service/routers/news.py`:
```python
class NewsAnalyzeResponse(BaseModel):
    overall_analysis: str
    sector_analyses: dict[str, str]
    sector_article_counts: dict[str, int]   # 신규
    run_duration_ms: int
```

`news_graph.py` 의 `aggregate_node` 결과에 `sector_article_counts: {s: len(arts) for s, arts in state["sector_articles"].items()}` 를 함께 반환하도록 그래프 상태를 통과시킨다. (별도 노드 추가 없이 `aggregate_node`에서 한 줄로 충분)

### 작업 B — Celery 태스크가 카운트 저장

`backend/apps/news/tasks.py` 의 sector_analyses 루프를 수정:

```python
counts = data.get("sector_article_counts", {})
for sector_name, analysis_text in data["sector_analyses"].items():
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
```

### 작업 C — 카운트 0인 섹터의 시각적 처리

프론트 `NewsBriefingDetail.tsx` 섹터 탭에서 `article_count === 0` 인 칩을 다음 둘 중 하나로 처리:
- 옵션 A: 회색·반투명 처리 + 클릭 시 "수집된 기사가 없습니다" 안내
- 옵션 B: 카운트 숫자 자체를 숨기고 점(•)으로 대체

권장: 옵션 A — 사용자에게 어떤 섹터가 비었는지 명확히 보여줌.

### 완료 기준
- [ ] 새 분석 1건 강제 실행 후 `NewsSectorAnalysis.article_count` 가 섹터별 0~5 범위로 채워짐
- [ ] 프론트 섹터 칩 카운트가 0이 아닌 섹터에서 실제 숫자 표시
- [ ] 0인 섹터는 시각적으로 구분

### 커밋
```
fix(news): sector_article_counts를 ai_service → Celery → DB까지 연결
```

---

## 꼭지 3: 마크다운 렌더링 정비 — `react-markdown` 도입

### 배경

현재 `NewsBriefingDetail.tsx` 의 `MarkdownSections` 는 `## ` 헤더 분할만 처리. LLM이 불릿 `- `, 굵게 `**`, 인용 `>`, 링크 등을 사용해도 평문으로 보여 가독성이 떨어진다.

### 작업 A — 의존성 추가

```bash
docker compose exec -T frontend npm install react-markdown remark-gfm
```

`package.json`에 두 라이브러리 들어감을 확인.

### 작업 B — 렌더러 교체

`frontend/src/components/news/NewsBriefingDetail.tsx`:

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MARKDOWN_COMPONENTS = {
  h2: (props) => (
    <h4 className="mb-1 mt-4 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]" {...props} />
  ),
  ul: (props) => <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 space-y-1 text-sm leading-relaxed" {...props} />,
  li: (props) => <li className="text-[var(--color-text)]" {...props} />,
  p:  (props) => <p className="text-sm leading-relaxed text-[var(--color-text)]" {...props} />,
  strong: (props) => <strong className="font-semibold text-[var(--color-text)]" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-2 border-[var(--color-primary)] pl-3 text-sm italic text-[var(--color-text-sub)]" {...props} />
  ),
  a: (props) => (
    <a className="text-[var(--color-primary)] underline hover:no-underline"
       target="_blank" rel="noopener noreferrer" {...props} />
  ),
};

function SectorMarkdown({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-xs text-[var(--color-text-sub)]">분석 본문이 비어 있습니다.</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
```

기존 `MarkdownSections` 함수를 `SectorMarkdown` 으로 교체하고, `NewsBriefingCard.tsx` 의 미리보기 200자 트림 부분도 마크다운 토큰을 함께 잘라 렌더되도록 처리(또는 일반 텍스트 변환 후 트림).

### 작업 C — 본문 타이포그래피 정비

종합 요약 카드 ↔ 섹터 카드의 패딩·간격·헤더 강조 톤을 통일. 모바일에서 섹터 탭이 가로 스크롤 + 첫 칩이 잘리지 않도록 `pl-1` 추가 등 미세 조정.

### 완료 기준
- [ ] 분석에 불릿/굵게/인용/링크가 등장하면 시각적으로 구분되어 렌더
- [ ] `## Summary` 등 헤더가 컬러 강조 + 적절한 간격
- [ ] 모바일에서 섹터 탭 첫 칩 잘림 없음

### 커밋
```
feat(news): react-markdown 기반 SectorMarkdown 렌더러 + 타이포그래피 정비
```

---

## 꼭지 4 (옵션): Tavily 원문 메타를 raw_result에 보존

### 배경

분석 트리거 시 `multi_search_node` 가 받은 Tavily 검색 결과(원문 URL·제목)는 LLM 통과 후 사라진다. 다음 세션의 "원문 출처 카드" 노출 가능성을 위해 보존만 해두자.

### 작업

`news_graph.py` 의 `multi_search_node` 결과에 `sector_articles_meta: dict[sector, list[{title, url}]]` 추가 → `aggregate_node`가 응답에 포함 → `tasks.py` 가 `NewsAnalysis.raw_result` 에 저장 (이미 JSONField).

UI는 이 세션에서는 추가하지 않는다. 다음 세션에서 필요해지면 그때 노출.

### 완료 기준
- [ ] `NewsAnalysis.raw_result` 에 섹터별 원문 메타 보존
- [ ] 기존 화면은 그대로(회귀 없음)

### 커밋
```
chore(news): Tavily 원문 메타를 raw_result에 보존
```

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/news-briefing-quality

gh pr create --base dev --title "[feat] 뉴스 브리핑 품질 개선" --body "..."
gh pr merge <N> --merge --delete-branch --subject "..." --body "..."

git checkout dev && git pull origin dev
git branch -d feat/news-briefing-quality
mv prompts/session_26_news_briefing_quality.md prompts/_complete/
```

---

## 다음 세션 후보 (Topic 2, 3 — 사용자 백로그)

- **session_27**: **섹터별 종목 추천 (Topic 2)**
  - LangGraph에 `recommend_node` 추가 — 섹터 분석 텍스트 + Tavily 결과에서 매수 후보 2~3종목 추출
  - 새 모델: `NewsStockRecommendation(analysis_id, sector_id, ticker, company_name, rationale, confidence)` 또는 `NewsAnalysis.raw_result.recommendations` 로 시작
  - 프론트: 섹터 탭 하단에 추천 종목 카드 (티커·근거·신뢰도)
  - 면책: "투자 권유 아님 / 교육·참고 목적" 명시
  - 차후 확장 메모: 사용자 보유 포트폴리오 입력 시 매도·홀드 추천

- **session_28**: **재무지표 시계열 카드 + 차트 (Topic 3)**
  - DART 공시 직접 검색 UI를 **재무 핵심 지표 카드**로 대체
  - 데이터 소스: DART `fnlttSinglAcntAll.json` (전체 재무제표) + `prsblty.json` 등으로 PER·PBR·PSR·부채비율·매출·영업이익 추출
  - 캐시 전략: 분기 단위 갱신 (DART 공시 주기와 동일)
  - 프론트 차트: `recharts` 도입, 4~5분기 시계열 라인/바
  - 화면: `/finance/<ticker>` 또는 종목 검색 결과에서 진입
  - 참고할 디자인: 토스증권·카카오페이증권 종목 상세 페이지

---

## 메모: 차후 신경 쓸 점

- 분석 1회 LLM 호출 7회(섹터 6 + 종합 1) × Gemma 로컬 = 1~2분 소요. 사용자 폴링 한도(60회 × 3s = 3분)와 가까움. 토큰 예산 또는 동시성(asyncio.gather) 검토 후보.
- system 프롬프트 도입 후 출력 길이가 줄면 sector_analyses 텍스트가 짧아져 종합 요약 input 의 500자 트림(`a[:500]`)을 늘릴 여유가 생긴다.
