# Session 14: 대시보드 재구성

> **세션 목표**: ORNEO의 핵심 화면인 대시보드를 재설계한다. "오늘 할 행동"이 모바일 첫 화면에서 스크롤 없이 보이도록 정보 구조를 바꾸고, 로딩/에러/빈 상태를 제대로 처리한다.
> **예상 소요**: 2~2.5시간
> **작업량 기준**: 대시보드 집중 / 정보 구조 변경 + 상태 처리
> **브랜치**: `refactor/dashboard-restructure` (dev에서 분기)
> **참고 계획서**: `prompts/2026-04-25-ui-dashboard-refactor-plan.md` — Section 6
> **선행 세션**: Session 12 (Card variant), Session 13 (PageContainer) 완료 필수

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/project_conventions.md
Read .claude/memory/feedback_git_workflow.md
Read .claude/rules/git_workflow.md
Read prompts/2026-04-25-ui-dashboard-refactor-plan.md
```

---

## 꼭지 1: DashboardSkeleton 컴포넌트 신설

**파일**: `frontend/src/components/dashboard/DashboardSkeleton.tsx` (신규)

로딩 중 텍스트 "불러오는 중..." 대신 카드 형태의 Skeleton UI를 표시한다.
재설계 후 정보 순서(행동 → 질문 → 점수 → 진입)에 맞춰 skeleton을 배치한다.

```tsx
// frontend/src/components/dashboard/DashboardSkeleton.tsx
export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* 오늘 할 행동 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-44" />
      {/* 오늘의 핵심 질문 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-24" />
      {/* 라이프 캐피털 점수 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-52" />
      {/* 빠른 진입 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-20" />
    </div>
  );
}
```

**완료 기준**
- [ ] DashboardSkeleton이 animate-pulse로 카드 형태 표시 확인
- [ ] `npx tsc --noEmit` 통과

**커밋**
```
feat(frontend): DashboardSkeleton 컴포넌트 신설
```

---

## 꼭지 2: 대시보드 정보 구조 재설계

**파일**: `frontend/src/app/(app)/dashboard/page.tsx`

### 2-1. 핵심 변경: 정보 순서 변경

**기존 순서** (문제): 점수 게이지 → 핵심 질문 → 오늘 할 행동
**새 순서** (목표): **오늘 할 행동** → 핵심 질문 → 점수 게이지+상세 → 빠른 진입

### 2-2. 에러 상태 분리

**기존 코드**의 문제: `.catch(() => setData(MOCK))` — 에러인지 실제 데이터인지 사용자가 알 수 없음.

```typescript
// 상태 추가
const [data, setData] = useState<DashboardData | null>(null);
const [loading, setLoading] = useState(true);
const [isError, setIsError] = useState(false);  // ← 신규

useEffect(() => {
  api
    .get<DashboardData>("/dashboard")
    .then((res) => {
      setData(res);
      setIsError(false);
    })
    .catch(() => {
      setIsError(true);   // MOCK으로 덮지 않음
      setData(null);
    })
    .finally(() => setLoading(false));
}, []);

async function handleRetry() {
  setLoading(true);
  setIsError(false);
  // useEffect 재실행을 위해 key state 패턴 사용 또는 fetch 함수 추출 후 직접 호출
}
```

### 2-3. 페이지 전체 구조

```tsx
// 모바일: 단일 컬럼
// 데스크톱(sm 이상): 2컬럼 그리드

<PageContainer size="lg">
  <h1 className="mb-6 text-[22px] font-bold text-[var(--color-text)]">
    오늘의 대시보드
  </h1>

  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_360px] sm:gap-6">

    {/* ── 좌 컬럼: 점수 + 빠른 진입 ── */}
    <div className="contents sm:flex sm:flex-col sm:gap-4">

      {/* 1. 라이프 캐피털 점수 — 좌 컬럼 상단 */}
      <Card className="sm:order-1">
        <h2>이번 주 라이프 캐피털 점수</h2>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <CapitalScoreGauge score={d.score} />
          <ScoreBreakdown ... />
        </div>
      </Card>

      {/* 2. 빠른 진입 카드 — 좌 컬럼 하단 */}
      <Card variant="outlined" className="sm:order-2">
        <p>빠른 이동</p>
        <div className="mt-3 flex gap-2">
          <Link href="/journal">
            <Button variant="outline" size="sm" fullWidth>의사결정 일지 →</Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline" size="sm" fullWidth>주간 리포트 →</Button>
          </Link>
        </div>
      </Card>

    </div>

    {/* ── 우 컬럼: 행동 + 질문 ── */}
    <div className="contents sm:flex sm:flex-col sm:gap-3">

      {/* 3. 오늘 할 행동 — 우 컬럼 상단 (모바일에서는 가장 먼저 표시) */}
      <Card className="sm:order-first">
        <TodayActions actions={d.today_actions} onToggle={handleToggleAction} />
      </Card>

      {/* 4. 오늘의 핵심 질문 — 우 컬럼 하단 */}
      {d.key_question && (
        <KeyQuestion question={d.key_question} />
      )}

    </div>

  </div>
</PageContainer>
```

> **모바일 표시 순서**: `contents` + `sm:flex`를 조합하면 모바일에서 DOM 순서대로
> (행동 → 질문 → 점수 → 진입) 표시되고, 데스크톱에서 2컬럼 그리드가 된다.
>
> 구체적인 구현은 다를 수 있다. 핵심 목표: **모바일에서 TodayActions가 가장 먼저 보임**.

**완료 기준**
- [ ] 375px 모바일에서 스크롤 없이 TodayActions 카드 전체 노출 확인
- [ ] 640px 이상에서 2컬럼 그리드 표시 확인
- [ ] `npx tsc --noEmit` 통과

**커밋**
```
refactor(frontend): 대시보드 정보 구조 재설계 (행동 우선 배치)
```

---

## 꼭지 3: 로딩·에러·빈 상태 처리 + Card variant 적용

### 3-1. 로딩 상태 — Skeleton으로 교체

```tsx
if (loading) {
  return (
    <PageContainer size="lg">
      <DashboardSkeleton />
    </PageContainer>
  );
}
```

### 3-2. 에러 상태

```tsx
if (isError) {
  return (
    <PageContainer size="lg">
      <Card variant="outlined" className="py-12 text-center">
        <p className="text-sm text-[var(--color-danger)]">
          대시보드를 불러오지 못했습니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="mt-4"
        >
          다시 시도
        </Button>
      </Card>
    </PageContainer>
  );
}
```

### 3-3. 오늘 할 행동 빈 상태

`TodayActions` 컴포넌트 또는 dashboard 페이지에서 `today_actions.length === 0`일 때 처리:

```tsx
{d.today_actions.length === 0 ? (
  <Card variant="outlined" className="text-center py-8">
    <p className="text-sm text-[var(--color-text-sub)]">
      오늘의 행동이 아직 없어요.
    </p>
    <Link href="/goals" className="mt-3 inline-block">
      <Button variant="point" size="sm">목표에서 행동 추가하기 →</Button>
    </Link>
  </Card>
) : (
  <Card>
    <TodayActions actions={d.today_actions} onToggle={handleToggleAction} />
  </Card>
)}
```

### 3-4. 핵심 질문 없을 때

`key_question`이 빈 문자열이거나 null일 때 카드 숨김 처리 (꼭지 2에서 이미 반영).

### 3-5. Card variant 적용

| 카드 | variant | 이유 |
|------|---------|------|
| 오늘 할 행동 | `default` | 핵심 정보, 흰 배경 강조 |
| 오늘의 핵심 질문 | `point` | 포인트 컬러로 시각적 강조 |
| 라이프 캐피털 점수 | `default` | 게이지가 시각 요소를 담당 |
| 빠른 진입 | `outlined` | 보조 정보, 얇은 경계 |

> **KeyQuestion 컴포넌트**가 내부에 Card를 직접 생성하는 경우,
> `variant="point"` 적용이 어려울 수 있다. 컴포넌트 props 또는 className을 통해
> 외부에서 variant를 주입하거나, 컴포넌트 내부에서 point 스타일을 직접 적용한다.

**완료 기준**
- [ ] loading → DashboardSkeleton (애니메이션 확인)
- [ ] error → 에러 메시지 + 재시도 버튼 표시 (MOCK 대체 없음)
- [ ] today_actions 없음 → empty state + /goals CTA 버튼
- [ ] key_question 없음 → 해당 카드 숨김
- [ ] Card variant 색상 시각 확인 (point=청록, outlined=테두리만)
- [ ] `npm run build` + `npx tsc --noEmit` 통과

**커밋**
```
refactor(frontend): 대시보드 로딩·에러·빈 상태 처리 및 Card variant 적용
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin refactor/dashboard-restructure

gh pr create \
  --base dev \
  --title "[refactor] 대시보드 정보 구조 재설계" \
  --body "$(cat <<'EOF'
## 개요
오늘 할 행동이 모바일 첫 화면에서 스크롤 없이 보이도록 정보 구조를 재설계.
에러/로딩/빈 상태를 명확하게 처리.

## 변경 사항
- [ ] DashboardSkeleton 컴포넌트 신설
- [ ] 정보 순서 변경: 행동 → 질문 → 점수 → 빠른 진입
- [ ] 데스크톱 2컬럼 그리드 (sm:grid-cols-[1fr_360px])
- [ ] 에러 상태: MOCK 대체 제거 → isError state + 재시도 버튼
- [ ] 빈 상태: today_actions 없음 → /goals CTA
- [ ] Card variant 적용 (point/outlined)

## 테스트
- [ ] 375px에서 스크롤 없이 TodayActions 카드 보임
- [ ] 640px 이상에서 2컬럼 그리드 확인
- [ ] loading: Skeleton 표시
- [ ] error: MOCK 아닌 에러 메시지 표시
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] 기존 API 연동 유지 (DashboardData 타입 변경 없음)
- [ ] 기존 컴포넌트(CapitalScoreGauge, ScoreBreakdown, TodayActions, KeyQuestion) 재사용
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/refactor/dashboard-restructure" \
  --body "$(cat <<'EOF'
[refactor] 대시보드 정보 구조 재설계

- 오늘 할 행동을 모바일 첫 화면 최상단으로 이동
- 데스크톱 2컬럼 그리드 적용
- DashboardSkeleton 신설 (animate-pulse)
- 에러 상태 분리 (MOCK 폴백 제거)
- 빈 상태 처리 + Card variant 적용
EOF
)"

git checkout dev && git pull origin dev
git branch -d refactor/dashboard-restructure

mv prompts/session_14_dashboard_restructure.md prompts/_complete/
```
