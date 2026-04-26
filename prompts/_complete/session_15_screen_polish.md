# Session 15: 주요 화면 폴리싱

> **세션 목표**: 의사결정 일지, 목표 관리, 주간 리포트, 로그인 화면의 인라인 스타일 override를 공통 컴포넌트로 교체하고, 각 화면의 UX를 다듬는다.
> **예상 소요**: 2~2.5시간
> **작업량 기준**: 화면 수가 많음 / 개선 단위는 작음
> **브랜치**: `refactor/screen-polish` (dev에서 분기)
> **참고 계획서**: `prompts/2026-04-25-ui-dashboard-refactor-plan.md` — Section 7 (P1 대상)
> **선행 세션**: Session 12 (공통 컴포넌트), Session 13 (PageContainer) 완료 필수

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

## 꼭지 1: 의사결정 일지 화면 개선

**파일들**:
- `frontend/src/app/(app)/journal/page.tsx`
- `frontend/src/components/journal/JournalCard.tsx`
- `frontend/src/components/journal/CategoryTabs.tsx`

### 1-1. JournalCard에 interactive Card 적용

현재 `JournalCard`가 어떻게 구현되어 있는지 확인 후, 카드 전체를 클릭 가능하게 만든다.

```tsx
// JournalCard.tsx — 개선 방향
// 카드 클릭 시 일지 상세 또는 복기 모달 오픈
<Card
  interactive
  as="article"
  padding="md"
  onClick={() => onReview(entry)}  // 또는 상세 라우팅
>
  {/* 카드 내용 */}
</Card>
```

### 1-2. AI 요약 생성 중 UX 개선

현재: 폴링 중이어도 카드에 별도 표시 없음.
개선: `ai_summary === null`인 카드에 "AI 요약 생성 중..." 텍스트 + 작은 spinner 표시.

```tsx
{entry.ai_summary === null ? (
  <div className="flex items-center gap-2 text-xs text-[var(--color-text-sub)]">
    <svg className="h-3 w-3 animate-spin" .../>  {/* Button의 spinner SVG 재사용 */}
    <span>AI 요약 생성 중...</span>
  </div>
) : (
  <p className="text-sm text-[var(--color-text-sub)] line-clamp-2">{entry.ai_summary}</p>
)}
```

### 1-3. Empty state 컴포넌트화

현재 journal/page.tsx의 empty state가 인라인 div로 직접 구현되어 있다.
`Card(variant="outlined")`로 교체한다.

```tsx
// 현재
<div className="rounded-2xl bg-[var(--color-card)] px-6 py-12 text-center shadow-sm">

// 개선
<Card variant="outlined" className="py-12 text-center">
```

### 1-4. CategoryTabs 스타일 정리

현재 `CategoryTabs` 내부의 탭 버튼 스타일이 `goals/page.tsx`의 카테고리 탭과 동일한 패턴이지만 별도로 구현되어 있다. 두 파일의 스타일을 동일하게 맞춘다. (공통 Tabs 컴포넌트 추출은 이번 세션에서 하지 않는다 — 별도 작업으로 보류)

활성 탭에 `bg-[var(--color-primary)]` + `text-white` 대신 gradient 적용 고려:
```
bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] text-white
```

**완료 기준**
- [ ] JournalCard 전체 클릭 시 복기 모달 또는 상세 진입 확인
- [ ] ai_summary=null 카드에 spinner 표시 확인
- [ ] empty state Card(outlined) 표시 확인
- [ ] 빌드 에러 없음

**커밋**
```
refactor(frontend): 의사결정 일지 화면 UX 개선 (interactive Card, AI 로딩 표시)
```

---

## 꼭지 2: 목표 관리 화면 개선

**파일들**:
- `frontend/src/app/(app)/goals/page.tsx`
- `frontend/src/components/goals/GoalCard.tsx`
- `frontend/src/components/goals/GoalCreateModal.tsx`

### 2-1. FAB → Button(icon) 교체

현재 FAB이 `<button>` 직접 구현. `Button` 컴포넌트로 교체한다.

```tsx
// 현재
<button
  onClick={() => setShowModal(true)}
  className="fixed bottom-20 right-6 flex h-14 w-14 items-center justify-center
             rounded-full bg-gradient-to-br from-[...] ..."
>

// 개선 — Button(size="icon") 사용
// 단, Button의 icon size는 h-11 w-11 (44px). FAB은 56px이 일반적.
// → size="icon"을 기반으로 className override 허용
<Button
  variant="primary"
  size="icon"
  onClick={() => setShowModal(true)}
  aria-label="목표 추가"
  className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-6
             h-14 w-14 shadow-[var(--shadow-fab)]
             sm:bottom-8"
>
  <svg .../>  {/* plus icon */}
</Button>
```

> **FAB bottom 값**: 하단 nav(64px) + safe-area + 여유 16px.
> 기존 `bottom-20 sm:bottom-8`에서 safe area를 고려한 값으로 업데이트.

### 2-2. 카테고리 탭 스타일 — journal과 통일

goals/page.tsx 인라인 탭 버튼 스타일을 CategoryTabs와 동일하게 맞춘다.

### 2-3. Empty state 개선

현재:
```tsx
<div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)]">
```

개선:
```tsx
<Card variant="outlined" className="flex flex-col items-center justify-center py-10 text-center">
  <p className="text-sm text-[var(--color-text-sub)]">목표가 없습니다.</p>
  <Button variant="point" size="sm" onClick={() => setShowModal(true)} className="mt-3">
    첫 번째 목표 만들기
  </Button>
</Card>
```

**완료 기준**
- [ ] FAB이 Button 컴포넌트로 동작하며 aria-label 확인
- [ ] FAB이 모바일 하단 nav 위에 위치 확인 (safe area 포함)
- [ ] empty state Card(outlined) 표시 + CTA 버튼 동작 확인
- [ ] 빌드 에러 없음

**커밋**
```
refactor(frontend): 목표 관리 화면 FAB·empty state 개선
```

---

## 꼭지 3: 주간 리포트 & 로그인 화면 개선

### 3-1. 주간 리포트 — empty/error state 정리

**파일**: `frontend/src/app/(app)/reports/page.tsx`

현재 에러 div:
```tsx
// 현재
<div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">

// 개선 — Toast(type="error") 방식 또는 Card(variant="outlined") + 빨간 텍스트
<Card variant="outlined" className="mb-4">
  <p className="text-sm text-[var(--color-danger)]">{error}</p>
</Card>
```

현재 empty div:
```tsx
// 현재
<div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed ...">

// 개선
<Card variant="outlined" className="flex flex-col items-center gap-4 py-16 text-center">
  <p className="text-sm text-[var(--color-text-sub)]">
    아직 리포트가 없습니다. 매주 월요일에 자동 생성됩니다.
  </p>
  <Button variant="primary" onClick={handleGenerate} loading={generating}>
    지금 생성하기
  </Button>
</Card>
```

### 3-2. 로그인 화면 — Google 버튼 정리

**파일**: `frontend/src/app/(auth)/login/page.tsx`

현재 Google 로그인이 `<a>` 태그로 직접 구현. 스타일은 유지하되, 포커스 상태를 개선한다.

```tsx
// focus-visible 추가
className="... focus-visible:outline-none focus-visible:ring-2
           focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
```

> **주의**: Google 로그인은 `<a href="/api/auth/social/google/init">` 링크 방식이라
> `Button` 컴포넌트로 교체할 경우 `onClick`에서 `router.push`를 써야 한다.
> 현재 구현을 유지하고 스타일만 개선하는 것을 권장한다.

### 3-3. 온보딩 — Input suffix 교체 확인

Session 12 (꼭지 3)에서 온보딩 Step1의 "원" suffix를 `Input(suffix=...)` 으로 교체했어야 한다.
교체되지 않았다면 이 꼭지에서 처리한다.

```tsx
// frontend/src/app/(onboarding)/onboarding/page.tsx — Step1
// 기존: 수동 absolute span
// 개선:
<Input
  id="monthly_savings"
  type="number"
  inputMode="numeric"
  placeholder="300000"
  suffix={<span className="text-sm">원</span>}
  value={data.monthly_savings_goal || ""}
  onChange={(e) => onChange({ monthly_savings_goal: Number(e.target.value) })}
/>
```

**완료 기준**
- [ ] reports: Card(outlined)로 empty/error state 표시 확인
- [ ] login: focus-visible ring 키보드 포커스 시 표시 확인
- [ ] onboarding Step1: Input suffix "원" 표시 정상 확인
- [ ] `npm run build` + `npx tsc --noEmit` 통과
- [ ] 모든 화면에서 인라인 hover/active override 제거 확인

**커밋**
```
refactor(frontend): 리포트·로그인·온보딩 화면 공통 컴포넌트 적용
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin refactor/screen-polish

gh pr create \
  --base dev \
  --title "[refactor] 주요 화면 공통 컴포넌트 적용 및 폴리싱" \
  --body "$(cat <<'EOF'
## 개요
journal, goals, reports, login, onboarding 화면에서 인라인 스타일 override를
공통 컴포넌트로 교체하고 UX를 다듬는다.

## 변경 사항
- [ ] JournalCard: interactive Card + AI 요약 생성 중 spinner
- [ ] journal page: empty state → Card(outlined)
- [ ] goals page: FAB → Button(icon) + safe area bottom
- [ ] goals page: empty state → Card(outlined) + Button(point)
- [ ] reports page: error/empty state → Card(outlined)
- [ ] login page: focus-visible ring 추가
- [ ] onboarding Step1: Input suffix prop 교체

## 테스트
- [ ] 의사결정 일지 JournalCard 클릭 확인
- [ ] 목표 FAB 모바일 위치 확인 (nav 위)
- [ ] 모든 화면 빌드 에러 없음
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] 기존 API 연동 변경 없음
- [ ] 기존 기능(일지 작성, 목표 생성, 리포트 생성) 회귀 없음
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/refactor/screen-polish" \
  --body "$(cat <<'EOF'
[refactor] 주요 화면 공통 컴포넌트 적용 및 폴리싱

- JournalCard interactive + AI 로딩 spinner
- goals FAB Button(icon) 교체 + safe area 처리
- reports/journal empty·error state Card(outlined) 통일
- login focus-visible ring 추가
- onboarding Input suffix prop 교체
EOF
)"

git checkout dev && git pull origin dev
git branch -d refactor/screen-polish

mv prompts/session_15_screen_polish.md prompts/_complete/
```
