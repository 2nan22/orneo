# Session 30: Canvas 디자인 1:1 매핑 — UI 컴포넌트 분리 + 디자인 토큰 + 양시장 화면

> **세션 목표**: Gemini Canvas 결과(`canvas/news_briefing.tsx`)를 NewsBriefingDetail 에 매핑한다. 새 컴포넌트(MarketToggle, SignalIndicator, StockRecommendationChips, SectorSignalCard) 분리, 디자인 토큰(CSS 변수) 추가, 종합 요약 카드 안 그리드, HorizontalSectorCard 레이아웃 적용. 양시장 토글은 session 29 의 임시 토글을 정식 컴포넌트로 교체한다.
> **예상 소요**: 5 ~ 6시간
> **브랜치**: `feat/news-canvas-ui` (dev에서 분기)
> **선행 세션**: Session 29 (양시장 병렬 분석) 완료
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
# 디자인 결과물
Read /Users/2nan/Documents/Project/2026_oreneo/canvas/news_briefing.tsx

# 현재 화면
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/NewsBriefingDetail.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/news/StreamingSectorCard.tsx

# 디자인 시스템 / UI 프리미티브
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/ui/Card.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/ui/Button.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/components/ui/PageContainer.tsx
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/app/globals.css

# 타입
Read /Users/2nan/Documents/Project/2026_oreneo/frontend/src/lib/types.ts
```

---

## 배경 (현 상태)

session 28 로 시그널/종목 데이터가 모델에 적재되고, session 29 로 KR/US 양시장이 함께 응답된다. 하지만 화면은 아직 임시 placeholder 만 표시 — `signal: 4 · 추천: 삼성전자, ...` 한 줄 등. Canvas 디자인은 다음을 구현한다:

1. **MarketToggle** — 결과 화면 상단의 KR/US 탭 (Canvas 라인 667~690)
2. **SignalIndicator** — 5단계 바 + 레이블 ("적극 매도" ~ "적극 매수") (Canvas 라인 285~314)
3. **StockRecommendationChips** — 추천 종목 칩 목록 (Canvas 라인 718~728)
4. **SectorSignalCard** — 종합 요약 카드 안 그리드 셀 (섹터명 + 시그널 + 종목)
5. **HorizontalSectorCard** — 섹터 상세 카드의 좌측 메타 / 우측 본문 레이아웃 (Canvas 라인 334~385)
6. 종합 요약 카드 재구성 — "💡 섹터별 투자 시그널" 그리드 추가 (Canvas 라인 693~732)

이번 세션은 **순수 프론트 UI 작업**이다. 백엔드/AI 변경 없음.

---

## 꼭지 1: 디자인 토큰 추가 (CSS 변수)

### 작업

`frontend/src/app/globals.css` 에 시그널 색상 5단계 + 누락 토큰 추가.

```css
:root {
  /* 기존 토큰 — 유지 */
  --color-primary: #2563EB;
  --color-primary-end: #0C2AA8;
  --color-point: #00C2A8;
  /* ... */

  /* 신규 — 시그널 색상 1~5 */
  --color-signal-1: #DC2626;  /* 적극 매도 */
  --color-signal-2: #F97316;  /* 비중 축소 */
  --color-signal-3: #94A3B8;  /* 중립 */
  --color-signal-4: #3B82F6;  /* 비중 확대 */
  --color-signal-5: #1D4ED8;  /* 적극 매수 */

  /* 신규 — 보조 배경 (있다면 정리) */
  --color-bg-soft: #F8FAFC;
}
```

기존 `--color-bg`, `--color-card`, `--color-border` 등은 그대로 사용.

### 검증

- 새 변수 5개 + bg-soft 가 globals.css 에 정의됨
- DevTools 에서 `getComputedStyle(document.documentElement).getPropertyValue('--color-signal-3')` 로 확인 가능

### 완료 기준
- [ ] CSS 변수 5개 추가
- [ ] 컨테이너 빌드 영향 없음

### 커밋
```
chore(ui): 시그널 색상 5단계 + 보조 배경 토큰 추가
```

---

## 꼭지 2: SignalIndicator 컴포넌트

### 작업

`frontend/src/components/news/SignalIndicator.tsx` (신규):

```tsx
// frontend/src/components/news/SignalIndicator.tsx
"use client";

import type { InvestmentSignal } from "@/lib/types";

const SIGNAL_LABELS: Record<InvestmentSignal, string> = {
  1: "적극 매도",
  2: "비중 축소",
  3: "중립",
  4: "비중 확대",
  5: "적극 매수",
};

const SIGNAL_VAR: Record<InvestmentSignal, string> = {
  1: "var(--color-signal-1)",
  2: "var(--color-signal-2)",
  3: "var(--color-signal-3)",
  4: "var(--color-signal-4)",
  5: "var(--color-signal-5)",
};

interface Props {
  signal: InvestmentSignal;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export default function SignalIndicator({
  signal,
  size = "md",
  showLabel = true,
  className = "",
}: Props) {
  const color = SIGNAL_VAR[signal];
  const label = SIGNAL_LABELS[signal];
  const barH = size === "sm" ? "h-1" : "h-1.5";
  const labelText = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-bold ${labelText}`}
            style={{ color }}
          >
            {label}
          </span>
          <span className={`${labelText} text-[var(--color-text-sub)]`}>{signal}/5</span>
        </div>
      )}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${barH}`}
            style={{
              backgroundColor: i <= signal ? color : "var(--color-border)",
              opacity: i <= signal ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

### 검증

별도 storybook 환경 없으므로 dashboard 화면 어딘가에 임시 5개 SignalIndicator 를 임포트해 시각 확인. 또는 다음 꼭지에서 SectorSignalCard 안에서 검증.

### 완료 기준
- [ ] 1~5 모든 signal 값에 대해 색상이 지정 변수로 출력
- [ ] sm/md 사이즈 두 종류 정상 렌더
- [ ] showLabel=false 일 때 바만 표시

### 커밋
```
feat(news): SignalIndicator 컴포넌트
```

---

## 꼭지 3: StockRecommendationChips 컴포넌트

### 작업

`frontend/src/components/news/StockRecommendationChips.tsx` (신규):

```tsx
// frontend/src/components/news/StockRecommendationChips.tsx
"use client";

import type { RecommendedStock } from "@/lib/types";

interface Props {
  stocks: RecommendedStock[];
  emptyText?: string;
  className?: string;
}

export default function StockRecommendationChips({
  stocks,
  emptyText = "추천 종목이 없습니다.",
  className = "",
}: Props) {
  if (stocks.length === 0) {
    return (
      <p className={`text-xs text-[var(--color-text-sub)] ${className}`}>{emptyText}</p>
    );
  }
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {stocks.map((s) => (
        <span
          key={s.ticker}
          className="rounded border border-[var(--color-border)] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text)]"
          title={`${s.name} (${s.ticker})`}
        >
          {s.name}
        </span>
      ))}
    </div>
  );
}
```

### 완료 기준
- [ ] 빈 배열 → emptyText 표시
- [ ] 종목 칩 hover 시 ticker 가 tooltip 으로 노출

### 커밋
```
feat(news): StockRecommendationChips 컴포넌트
```

---

## 꼭지 4: MarketToggle 컴포넌트

### 작업

`frontend/src/components/news/MarketToggle.tsx` (신규):

```tsx
// frontend/src/components/news/MarketToggle.tsx
"use client";

import type { MarketCode } from "@/lib/types";

interface Props {
  value: MarketCode;
  onChange: (next: MarketCode) => void;
  className?: string;
}

const MARKETS: { code: MarketCode; label: string }[] = [
  { code: "KR", label: "🇰🇷 한국 시장" },
  { code: "US", label: "🇺🇸 미국 시장" },
];

export default function MarketToggle({ value, onChange, className = "" }: Props) {
  return (
    <div
      role="tablist"
      aria-label="시장 선택"
      className={`flex self-start rounded-lg border border-[var(--color-border)] bg-white p-1 shadow-sm ${className}`}
    >
      {MARKETS.map((m) => {
        const active = value === m.code;
        return (
          <button
            key={m.code}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.code)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-[var(--color-text)] text-white"
                : "text-[var(--color-text-sub)] hover:text-[var(--color-text)]"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
```

> Canvas 디자인은 active 시 어두운 배경(거의 검정)을 사용한다 — `--color-text` (`#0B132B`) 를 그대로 활용.

### 완료 기준
- [ ] 키보드 접근성 (role=tab, aria-selected)
- [ ] 토글 클릭 시 onChange 호출

### 커밋
```
feat(news): MarketToggle 컴포넌트 (정식 디자인)
```

---

## 꼭지 5: SectorSignalCard 컴포넌트 (종합 요약 그리드 셀)

### 작업

`frontend/src/components/news/SectorSignalCard.tsx` (신규):

```tsx
// frontend/src/components/news/SectorSignalCard.tsx
"use client";

import type { NewsSectorAnalysis } from "@/lib/types";
import SignalIndicator from "@/components/news/SignalIndicator";
import StockRecommendationChips from "@/components/news/StockRecommendationChips";

interface Props {
  sector: NewsSectorAnalysis;
  onClick?: () => void;
  className?: string;
}

export default function SectorSignalCard({ sector, onClick, className = "" }: Props) {
  const isEmpty = sector.article_count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isEmpty}
      className={`flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 text-left transition-shadow hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-[var(--color-text)]">
          {sector.sector_name_ko}
        </span>
        <span className="text-[10px] text-[var(--color-text-sub)]">{sector.article_count}건</span>
      </div>
      <SignalIndicator signal={sector.investment_signal} size="sm" />
      <StockRecommendationChips
        stocks={sector.recommended_stocks}
        emptyText="—"
      />
    </button>
  );
}
```

`onClick` 으로 부모 컴포넌트가 섹터 탭으로 스크롤 또는 활성화. 빈 섹터(article_count=0)는 disabled 상태.

### 완료 기준
- [ ] 시그널 + 종목 칩이 같이 표시
- [ ] 빈 섹터는 disabled
- [ ] hover 시 그림자 약간 강조

### 커밋
```
feat(news): SectorSignalCard 컴포넌트 (요약 카드 그리드 셀)
```

---

## 꼭지 6: StreamingSectorCard 가로형 레이아웃 적용

### 작업

`frontend/src/components/news/StreamingSectorCard.tsx` 를 Canvas 의 HorizontalSectorCard (라인 334~385) 디자인으로 재구성.

```tsx
// frontend/src/components/news/StreamingSectorCard.tsx
"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Card from "@/components/ui/Card";
import SignalIndicator from "@/components/news/SignalIndicator";
import StockRecommendationChips from "@/components/news/StockRecommendationChips";
import type { InvestmentSignal, RecommendedStock } from "@/lib/types";

export type StreamStatus = "pending" | "streaming" | "done";

interface Props {
  name: string;
  text: string;
  status: StreamStatus;
  articleCount?: number;
  elapsedMs?: number;
  signal?: InvestmentSignal;             // 신규
  stocks?: RecommendedStock[];           // 신규
}

// MARKDOWN COMPONENTS — 기존 유지
const COMPONENTS: Components = { /* 기존 */ };

function StatusDot({ status }: { status: StreamStatus }) { /* 기존 */ }

export default function StreamingSectorCard({
  name, text, status, articleCount, elapsedMs, signal, stocks,
}: Props) {
  const cardClass =
    status === "pending"
      ? "border-dashed opacity-60"
      : status === "streaming"
        ? "border-[var(--color-primary)]"
        : "";

  const statusLabel =
    status === "pending"
      ? "대기 중…"
      : status === "streaming"
        ? "분석 중…"
        : elapsedMs !== undefined
          ? `${(elapsedMs / 1000).toFixed(1)}s`
          : "완료";

  return (
    <Card variant="outlined" padding="md" className={cardClass}>
      {/* md 이상: flex-row 가로 / 모바일: flex-col */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        {/* 좌측 메타 (md 이상에서 1/4 너비) */}
        <div className="md:w-1/4 md:shrink-0">
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <h3 className="text-sm font-bold text-[var(--color-text)]">{name}</h3>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {articleCount !== undefined && (
              <span className="rounded-full bg-[var(--color-bg)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-sub)]">
                {articleCount}건
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-sub)]">{statusLabel}</span>
          </div>
          {status === "done" && signal !== undefined && (
            <div className="mt-2">
              <SignalIndicator signal={signal} size="sm" showLabel />
            </div>
          )}
          {status === "done" && stocks && stocks.length > 0 && (
            <div className="mt-2">
              <StockRecommendationChips stocks={stocks} />
            </div>
          )}
        </div>

        {/* 우측 본문 (3/4 너비) */}
        <div className="md:flex-1">
          {status === "pending" ? (
            <div className="space-y-1">
              <div className="h-2 w-3/4 rounded bg-[var(--color-border)] opacity-50" />
              <div className="h-2 w-1/2 rounded bg-[var(--color-border)] opacity-40" />
            </div>
          ) : text.trim() ? (
            <div className="flex flex-col">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
                {text}
              </ReactMarkdown>
              {status === "streaming" && (
                <span className="mt-1 inline-block h-3 w-[2px] animate-pulse bg-[var(--color-primary)]" />
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-sub)]">분석 결과가 비어 있습니다.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
```

### 완료 기준
- [ ] 모바일 (sm 미만) 에서는 flex-col, md 이상에서는 flex-row
- [ ] done 상태일 때만 signal/stocks 노출
- [ ] 기존 streaming/pending 상태 회귀 없음

### 커밋
```
feat(news): StreamingSectorCard 가로형 레이아웃 + signal/stocks 표시
```

---

## 꼭지 7: NewsBriefingDetail 통합

### 작업 A — MarketToggle 통합

session 29 의 임시 토글을 MarketToggle 정식 컴포넌트로 교체. 위치: 헤더 아래 / 결과 화면 위.

### 작업 B — 종합 요약 카드 안에 SectorSignalCard 그리드

`NewsBriefingDetail.tsx` 의 종합 요약 Card 영역을 다음으로 교체:

```tsx
<Card padding="md">
  <h2 className="mb-2 text-sm font-bold text-[var(--color-text)]">종합 요약</h2>
  {market.overall_analysis ? (
    <SectorMarkdown text={market.overall_analysis} />
  ) : (
    <p className="text-sm text-[var(--color-text-sub)]">(요약이 비어 있습니다)</p>
  )}

  {/* 💡 섹터별 투자 시그널 + 추천 종목 그리드 */}
  {market.sector_analyses.length > 0 && (
    <div className="mt-4 border-t border-[var(--color-border)] pt-3">
      <p className="mb-2 text-xs font-bold text-[var(--color-text)]">
        💡 섹터별 투자 시그널 + 추천 종목
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {market.sector_analyses.map((s) => (
          <SectorSignalCard
            key={s.id}
            sector={s}
            onClick={() => setActiveSectorId(s.id)}
          />
        ))}
      </div>
    </div>
  )}

  {market.run_duration_ms !== null && (
    <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">
      생성 소요: {(market.run_duration_ms / 1000).toFixed(1)}s
    </p>
  )}
</Card>
```

> `market` 변수는 `analysis.markets[activeMarket]` 의 결과 (session 29 에서 도입).

### 작업 C — 섹터 탭 영역의 시그널/종목 노출

session 28 의 임시 한 줄 표시를 SignalIndicator + StockRecommendationChips 정식 표현으로 교체:

```tsx
{(() => {
  const active = market.sector_analyses.find((s) => s.id === activeSectorId);
  if (!active) return null;
  if (active.article_count === 0) {
    return (...);  // 기존 빈 섹터 메시지
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <SignalIndicator
          signal={active.investment_signal}
          size="md"
          className="sm:w-1/3"
        />
        <StockRecommendationChips stocks={active.recommended_stocks} className="sm:flex-1" />
      </div>
      <SectorMarkdown text={active.analysis_text} />
    </div>
  );
})()}
```

### 작업 D — 스트리밍 영역의 StreamingSectorCard 양시장 그리드

```tsx
{streamingActive && (
  <div className="mb-4 flex flex-col gap-3">
    <Card padding="md" variant="outlined">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--color-text)]">실시간 분석</h2>
        <MarketToggle value={activeMarket} onChange={setActiveMarket} />
      </div>

      <div className="flex flex-col gap-3">
        {sectorOrder[activeMarket].map((name) => {
          const s = streamSectors[activeMarket]?.[name] ?? {
            text: "", status: "pending" as StreamStatus,
          };
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

      {/* 종합 요약 진행 영역은 기존 그대로 (market 별 streamOverall) */}
    </Card>
  </div>
)}
```

### 작업 E — 헤더 위치 정리

Canvas 디자인의 헤더 (Market Briefing 텍스트 + 날짜 네비 + Regenerate 버튼) 가 모바일에서 줄바꿈으로 깔끔하게 떨어지도록 `flex-wrap` + 우측 그룹은 sticky 또는 자연스럽게.

### 검증

브라우저 — Playwright 가능하면 spec 1개 추가:

```ts
// frontend/e2e/news.spec.ts (신규)
test("뉴스 화면에서 KR/US 토글이 동작하고 SignalIndicator/Chips 가 표시된다", async ({ page }) => {
  // 사전: 토큰 쿠키 주입 + /news 진입
  // expect: MarketToggle 클릭 시 active 상태 변경, 시그널 5단계 바 visible, 종목 칩 visible
});
```

수동 검증:
1. `/news` 진입 → "다시 생성" 클릭
2. 양시장 placeholder 카드가 토글 따라 분기 (KR 7개 / US 6개)
3. 각 카드 분석 완료 후 좌측에 시그널 + 종목 칩 노출
4. 종합 요약 카드 안에 6~7개 SectorSignalCard 그리드 표시
5. SectorSignalCard 클릭 시 해당 섹터 탭으로 전환

### 완료 기준
- [ ] 모바일/데스크톱 양쪽에서 레이아웃 깨짐 없음
- [ ] KR/US 토글 시 화면 데이터/그리드 모두 분기
- [ ] 시그널 색상이 1~5 모두 정상 표시 (직접 5단계 분석 확인)
- [ ] 컨테이너 type-check 통과

### 커밋
```
feat(news): NewsBriefingDetail 통합 — MarketToggle/SectorSignalCard 그리드/HorizontalSectorCard
```

---

## 꼭지 8 (옵션): hover/focus 미세 다듬기

- SectorSignalCard hover 시 좌측 액센트 바 또는 약간 들리는 효과
- SignalIndicator 의 5/5 표시 폰트 무게 조절
- 종목 칩이 5개 넘을 때 줄바꿈 처리 자연스러움 검증

선택. 시간 남으면 진행.

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/news-canvas-ui

gh pr create --base dev \
  --title "[feat] Canvas 디자인 적용 — MarketToggle/SignalIndicator/SectorSignalCard" \
  --body "..."

gh pr merge <N> --merge --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/news-canvas-ui" \
  --body "..."

git checkout dev && git pull origin dev
git branch -d feat/news-canvas-ui
mv prompts/session_30_news_canvas_ui_redesign.md prompts/_complete/
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

- **Canvas 의 SearchResultCard** 는 session 31 에서 사용. 이번 세션에서 미리 만들어 두지 않는다 (LLM 검색 진행 SSE 이벤트가 없으므로 데이터를 받을 수 없음)
- **다크모드** — 시그널 색상이 다크모드에서 시인성 확인 필요. 현재는 라이트모드 기준
- **a11y** — SignalIndicator 의 색상만으로 정보 전달되는 부분에 대해 텍스트 레이블도 같이 노출 (currently OK with showLabel)
- **관련 후속 세션**: session 31 (검색 진행 표시)
