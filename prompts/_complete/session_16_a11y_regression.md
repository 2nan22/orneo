# Session 16: 접근성 & 반응형 & 회귀 테스트

> **세션 목표**: UI 리팩토링 전 구간의 최종 검증. 접근성(WCAG AA), 반응형(375px/1280px), 기존 기능 회귀를 체계적으로 확인하고 빌드를 클린 상태로 마무리한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 테스트·수정 중심 / 발견된 이슈만 코드 변경
> **브랜치**: `refactor/a11y-responsive` (dev에서 분기)
> **참고 계획서**: `prompts/2026-04-25-ui-dashboard-refactor-plan.md` — Section 9
> **선행 세션**: Session 11~15 모두 dev 병합 완료 필수

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

## 꼭지 1: 명도 대비 & 접근성 점검

**목표**: WCAG 2.1 AA 기준 (일반 텍스트 4.5:1, 큰 텍스트·아이콘 3:1)

### 1-1. 주요 색상 조합 대비비 확인

Chrome DevTools → Elements → Accessibility 패널 또는
https://webaim.org/resources/contrastchecker/ 에서 직접 계산:

| 전경색 | 배경색 | 예상 대비비 | 기준 |
|--------|--------|------------|------|
| `#0B132B` (text) | `#F1F5F9` (bg) | ~13:1 ✅ | AA 통과 |
| `#334155` (text-sub) | `#FFFFFF` (card) | ~8.5:1 ✅ | AA 통과 |
| `#FFFFFF` | `#2563EB` (primary 버튼) | ~4.6:1 ✅ | AA 통과 |
| `#FFFFFF` | `#00C2A8` (point 버튼) | **~2.8:1 ⚠️** | **AA 실패 가능성** |
| `#FFFFFF` | `#22C55E` (success) | ~2.4:1 ❌ | 실패 |

> **`#00C2A8` (point) 버튼 조치 방안**:
> - 흰 텍스트 대신 어두운 텍스트 (`#0B132B`) 사용: `~8.0:1` ✅
> - 또는 point 색상을 더 어둡게 조정: `#009984` 수준
> - `Button(variant="point")`의 텍스트 색상을 `text-[var(--color-text)]`로 변경

> **success/warning Toast 조치 방안**:
> - success(`#22C55E`)에 흰 텍스트는 WCAG 실패. 어두운 텍스트로 변경하거나
>   배경색을 `#16a34a` (더 어두운 녹색)으로 조정.
> - warning(`#F59E0B`)도 흰 텍스트 기준 약 2.9:1 → 어두운 텍스트 사용 권장.

**수정 우선순위**: point 버튼 텍스트 색상 → Button.tsx 수정

### 1-2. focus-visible 전체 화면 확인

키보드 Tab 키로 각 화면을 순회하며 포커스 링이 표시되는지 확인.

체크 대상:
- [ ] `Button` 모든 variant — 파란 ring 표시
- [ ] `Input` — 파란 ring 표시, 마우스 클릭 시 ring 없음
- [ ] `Card(interactive)` — 파란 ring 표시
- [ ] 사이드바 / 하단 nav `Link` — ring 표시
- [ ] 모달 내 버튼 — ring 표시
- [ ] FAB 버튼 (goals 페이지) — ring 표시

포커스 트랩이 필요한 영역(GoalCreateModal, ReviewModal): Tab 키가 모달 내에서만 순환하는지 확인.
현재 모달에 포커스 트랩이 없으면 "확인 필요 — 다음 단계로 미룸" 으로 표시.

### 1-3. 시맨틱 마크업 점검

```
/dashboard  → <h1> 1개, <h2> 섹션별 확인
/journal    → 목록이 <ul><li> 또는 <article> 구조인지 확인
/goals      → GoalCard가 <article> as 사용하는지 확인
/reports    → 리포트 카드 시맨틱 확인
```

**완료 기준**
- [ ] point 버튼 텍스트 대비비 수정 (`#00C2A8` + 어두운 텍스트 또는 색상 조정)
- [ ] success/warning Toast 텍스트 대비비 수정
- [ ] 키보드 포커스 링 표시 확인 (전 화면)
- [ ] 주요 화면 h1 1개 확인

**커밋**
```
fix(frontend): 접근성 개선 — point/success/warning 색상 대비비 수정
```

---

## 꼭지 2: 375px 모바일 & 데스크톱 반응형 체크리스트

DevTools → Device: **iPhone SE (375×667)** 기준으로 각 화면을 확인한다.

### 모바일 375px 체크리스트

**공통 레이아웃**
- [ ] 가로 스크롤 없음 (모든 화면)
- [ ] 하단 nav 4탭 표시, 텍스트 잘림 없음
- [ ] 하단 nav safe area padding 적용 (iOS: 홈 인디케이터 침범 없음)
- [ ] 모바일 헤더 표시 (로고 + 설정 아이콘)
- [ ] 콘텐츠가 하단 nav에 가려지지 않음

**대시보드**
- [ ] TodayActions 카드가 스크롤 없이 전체 표시
- [ ] KeyQuestion 카드 표시
- [ ] CapitalScoreGauge + ScoreBreakdown 표시

**의사결정 일지**
- [ ] CategoryTabs 가로 스크롤 동작 (overflow-x-auto)
- [ ] JournalCard 클릭 → 복기 모달 오픈
- [ ] 새 일지 작성 버튼 표시

**목표 관리**
- [ ] 카테고리 탭 스크롤 동작
- [ ] GoalCard 진척도 바 표시
- [ ] FAB이 하단 nav 위에 표시

**주간 리포트**
- [ ] 생성 버튼 표시 + 동작

**설정**
- [ ] 로그아웃 버튼 표시 + 동작

**입력 컴포넌트**
- [ ] Input 터치 타깃 44px 이상 (py-3 확인)
- [ ] Button md size 터치 타깃 44px 이상

### 데스크톱 1280px 체크리스트

- [ ] 사이드바 표시 (하단 nav 숨김)
- [ ] 대시보드 2컬럼 그리드 (sm:grid-cols-[1fr_360px])
- [ ] 콘텐츠 최대 너비 제한 적용 (PageContainer)
- [ ] 사이드바 설정 링크 표시

**완료 기준**
- [ ] 위 체크리스트 항목 모두 통과
- [ ] 통과 실패 항목은 즉시 수정 또는 "다음 이터레이션" 이슈로 기록

**커밋** (수정 사항이 있는 경우)
```
fix(frontend): 반응형 레이아웃 수정 — [수정 내용 한 줄 요약]
```

---

## 꼭지 3: 기능 회귀 & 최종 빌드 확인

### 3-1. 기존 기능 회귀 테스트 시나리오

E2E 플로우를 수동으로 순서대로 확인한다.

```
1. 로그인 플로우
   → /login 접근 → Google 로그인 버튼 표시 확인
   → 미인증 상태에서 /dashboard 접근 → /login 리다이렉트 확인

2. 온보딩 플로우
   → 5단계 이동 (이전/다음 버튼 동작)
   → Step1 Input suffix "원" 표시
   → Step4 태그 선택/해제
   → Step5 "시작하기" 버튼 동작

3. 대시보드
   → 데이터 로딩 → Skeleton 표시 → 데이터 표시
   → TodayActions 체크 토글 동작
   → 빠른 진입 카드 링크 (/journal, /reports) 동작

4. 의사결정 일지
   → 목록 표시 → 카테고리 탭 필터
   → 새 일지 작성 → 목록 갱신 확인
   → JournalCard 클릭 → 복기 모달 → 복기 저장

5. 목표 관리
   → 카테고리 필터
   → FAB 클릭 → GoalCreateModal 오픈 → 저장 → 목록 갱신

6. 주간 리포트
   → 빈 상태 표시 확인
   → "지금 생성하기" 버튼 → 리포트 표시

7. 설정
   → /settings 접근 → 로그아웃 버튼 → /login 이동 확인
```

### 3-2. 최종 빌드 확인

```bash
cd frontend

# 1. 프로덕션 빌드
npm run build

# 2. 타입 체크 (에러 0개 목표)
npx tsc --noEmit

# 3. 빌드 결과 확인 (번들 크기 이상 없음)
# .next/analyze 또는 빌드 출력에서 큰 청크 없는지 확인
```

### 3-3. Before/After 스크린샷 촬영

```bash
# after 스크린샷 저장 경로
mkdir -p ../prompts/screenshots/after
```

Session 11에서 촬영한 before 스크린샷과 같은 화면·크기로 after를 촬영한다:
- `/dashboard` (375px, 1280px)
- `/journal` (375px)
- `/goals` (375px)
- `/reports` (375px)
- `/onboarding` Step1 (375px)

### 3-4. 알려진 미해결 사항 기록

이 세션에서 발견했지만 이번 사이클에서 수정하지 않는 항목은
`prompts/known-issues.md`(신규 생성)에 기록한다.

```markdown
# ORNEO UI Refactor — Known Issues

> 마지막 업데이트: 2026-04-25

## 접근성
- [ ] GoalCreateModal, ReviewModal 포커스 트랩 미구현 (다음 이터레이션)

## 기능
- [ ] 설정 페이지 프로필 편집 미구현 (stub 상태)
- [ ] Textarea 공통 컴포넌트 미구현 (Input.tsx의 multiline 분리)

## 스타일
- [ ] dark mode 미구현 (globals.css에 예약 주석만)
```

**완료 기준**
- [ ] 회귀 테스트 7개 시나리오 통과
- [ ] `npm run build` 통과 (warning은 허용, error 없음)
- [ ] `npx tsc --noEmit` 타입 에러 0개
- [ ] after 스크린샷 저장 완료
- [ ] known-issues.md 생성

**커밋**
```
test(frontend): 접근성·반응형·회귀 테스트 완료 및 스크린샷 기록
docs(frontend): known-issues.md 생성 — 미해결 사항 기록
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin refactor/a11y-responsive

gh pr create \
  --base dev \
  --title "[refactor] 접근성·반응형·회귀 테스트 완료" \
  --body "$(cat <<'EOF'
## 개요
UI 리팩토링 사이클 최종 검증. 접근성 이슈 수정, 반응형 체크리스트 통과,
기존 기능 회귀 확인, 빌드 클린 마무리.

## 변경 사항
- [ ] point/success/warning 색상 대비비 수정 (WCAG AA)
- [ ] 반응형 레이아웃 이슈 수정 (발견된 경우)
- [ ] 빌드 에러/타입 에러 수정 (있는 경우)
- [ ] known-issues.md 생성

## 테스트
- [ ] 375px 모바일 체크리스트 통과
- [ ] 1280px 데스크톱 체크리스트 통과
- [ ] 회귀 테스트 7개 시나리오 통과
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] WCAG AA 대비비 통과 (주요 조합)
- [ ] 키보드 포커스 링 전 화면 확인
- [ ] after 스크린샷 저장
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/refactor/a11y-responsive" \
  --body "$(cat <<'EOF'
[refactor] 접근성·반응형·회귀 테스트 완료

- point/success/warning 색상 대비비 수정 (WCAG AA)
- 375px 모바일 + 1280px 데스크톱 체크리스트 통과
- 기존 기능 7개 시나리오 회귀 확인
- known-issues.md 생성
EOF
)"

git checkout dev && git pull origin dev
git branch -d refactor/a11y-responsive

# ★ [마일스톤 M4] UI 리팩토링 완성
# Session 11~16 모두 dev 병합 완료 후:
gh pr create \
  --base main \
  --title "[feat] UI 리팩토링 — 디자인 시스템 & 대시보드 재설계" \
  --body "$(cat <<'EOF'
## 개요
Session 11~16 UI 리팩토링 사이클 완성.

## 포함 내용 (Session 11~16)
- 디자인 토큰 확장 + Pretendard 폰트 로딩
- 공통 컴포넌트 (Card/Button/Input/Toast/PageContainer) 리팩토링
- 레이아웃·네비게이션 (모바일 헤더·safe area·설정 페이지)
- 대시보드 정보 구조 재설계 (행동 우선)
- 주요 화면 폴리싱
- 접근성·반응형·회귀 테스트 통과

## 테스트
- [ ] 전체 E2E 시나리오 통과
- [ ] npm run build 통과
EOF
)"

# 머지 후
gh pr merge <main-pr-number> \
  --merge \
  --subject "Merge pull request #N from 2nan22/dev" \
  --body "$(cat <<'EOF'
[feat] UI 리팩토링 — 디자인 시스템 & 대시보드 재설계

- 글로벌 디자인 토큰 (색상·그림자·radius) + Pretendard 폰트
- Card/Button/Input/Toast 공통 컴포넌트 완성형으로 개선
- PageContainer 신설, 앱 페이지 레이아웃 통일
- 모바일 Safe Area·하단 nav·헤더 정비
- 대시보드: 행동 우선 배치, 2컬럼 그리드, Skeleton/에러/빈 상태
- WCAG AA 대비비 준수, focus-visible, touch-manipulation
EOF
)"

git tag v0.4.0-ui-refactor && git push origin v0.4.0-ui-refactor

mv prompts/session_16_a11y_regression.md prompts/_complete/
```
