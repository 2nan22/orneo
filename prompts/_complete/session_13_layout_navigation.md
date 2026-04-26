# Session 13: 레이아웃 & 네비게이션 리팩토링

> **세션 목표**: 모바일 Safe Area를 처리하고, 하단 탭 네비의 UX를 정리하며, 설정 페이지 stub을 만들어 모바일 로그아웃 경로를 열어준다. 모든 앱 페이지를 `PageContainer`로 통일한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 레이아웃·네비 중심 / 신규 페이지 1개(stub)
> **브랜치**: `refactor/layout-navigation` (dev에서 분기)
> **참고 계획서**: `prompts/2026-04-25-ui-dashboard-refactor-plan.md` — Section 5
> **선행 세션**: Session 12 (PageContainer 컴포넌트) 완료 필수

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

## 꼭지 1: (app)/layout.tsx 리팩토링

**파일**: `frontend/src/app/(app)/layout.tsx`

### 1-1. NAV_ITEMS 구조 개선

```typescript
const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "대시보드",
    shortLabel: "홈",       // 하단 nav 레이블 (기존 replace 패턴 제거)
    icon: (...),
  },
  {
    href: "/journal",
    label: "의사결정 일지",
    shortLabel: "일지",
    icon: (...),
  },
  {
    href: "/goals",
    label: "목표 관리",
    shortLabel: "목표",
    icon: (...),
  },
  {
    href: "/reports",
    label: "주간 리포트",
    shortLabel: "리포트",
    icon: (...),
  },
];
// 사이드바: label 사용 / 하단 nav: shortLabel 사용
```

### 1-2. 모바일 헤더 추가 (sm:hidden)

앱 내 모든 화면 최상단에 표시. 사이드바가 없는 모바일 전용.

```tsx
{/* 모바일 헤더 */}
<header className="sticky top-0 z-30 flex items-center justify-between
                   border-b border-[var(--color-border)] bg-[var(--color-card)]
                   px-4 py-3 sm:hidden">
  <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)]
                   bg-clip-text text-lg font-bold text-transparent">
    ORNEO
  </span>
  <Link
    href="/settings"
    aria-label="설정"
    className="flex h-9 w-9 items-center justify-center rounded-full
               text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]
               focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-[var(--color-primary)]"
  >
    {/* 설정 아이콘 (기어) */}
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
               a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
               A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
               l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
               A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
               l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
               a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
               l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
               a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  </Link>
</header>
```

### 1-3. 하단 nav Safe Area + 활성 인디케이터

```tsx
{/* 하단 nav — 모바일 전용 */}
<nav
  className="fixed bottom-0 left-0 right-0 z-40
             border-t border-[var(--color-border)] bg-[var(--color-card)]
             pb-[env(safe-area-inset-bottom)]
             sm:hidden"
>
  <div className="flex">
    {NAV_ITEMS.map(({ href, shortLabel, icon }) => (
      <Link
        key={href}
        href={href}
        className={[
          "flex flex-1 flex-col items-center gap-1 pt-3 pb-2 text-xs font-medium",
          "transition-colors touch-manipulation",
          "focus-visible:outline-none focus-visible:bg-[var(--color-bg)]",
          isActive(href)
            ? "border-t-2 border-[var(--color-primary)] text-[var(--color-primary)]"
            : "border-t-2 border-transparent text-[var(--color-text-sub)]",
        ].join(" ")}
      >
        {icon}
        <span className="text-[10px]">{shortLabel}</span>
      </Link>
    ))}
  </div>
</nav>
```

### 1-4. 메인 콘텐츠 safe area padding 확보

```tsx
<main className="flex flex-1 flex-col bg-[var(--color-bg)]
                 pb-[calc(64px+env(safe-area-inset-bottom))]
                 sm:pb-0">
  <div className="flex-1">{children}</div>
</main>
```

> **제거**: 기존 `p-4 sm:p-8` 래퍼 div 제거.
> 각 page.tsx가 `PageContainer`로 자체 패딩을 가지므로 layout에서 중복 패딩 불필요.

### 1-5. 사이드바에 설정 링크 추가

```tsx
{/* 사이드바 하단 — 로그아웃 위에 설정 추가 */}
<Link
  href="/settings"
  className={[
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive("/settings")
      ? "bg-[var(--color-bg)] text-[var(--color-primary)]"
      : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]",
  ].join(" ")}
>
  {/* 설정 아이콘 */}
  <svg .../>  {/* 위의 gear SVG와 동일 */}
  설정
</Link>
```

**완료 기준**
- [ ] 375px 모바일에서 하단 nav 4탭 표시 확인
- [ ] 활성 탭에 상단 파란 border-t-2 표시 확인
- [ ] iOS Safari에서 하단 홈 인디케이터 영역 침범 없음 확인
- [ ] 모바일 헤더 로고 + 설정 아이콘 표시 확인
- [ ] 사이드바 설정 링크 노출 확인 (640px 이상)
- [ ] 기존 4개 탭 이동 정상 확인

**커밋**
```
refactor(frontend): (app)/layout.tsx 모바일 헤더·safe area·nav 개선
```

---

## 꼭지 2: 설정 페이지 stub 생성

**파일**: `frontend/src/app/(app)/settings/page.tsx` (신규)

최소 기능: 로그아웃 버튼 + 온보딩 정보 요약 표시 (placeholder).
모바일에서 로그아웃할 수 있는 경로를 우선 연다.

```typescript
// frontend/src/app/(app)/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <PageContainer size="sm">
      <h1 className="mb-6 text-[22px] font-bold text-[var(--color-text)]">설정</h1>

      {/* 프로필 섹션 (placeholder) */}
      <Card className="mb-4">
        <p className="text-sm font-semibold text-[var(--color-text)]">프로필</p>
        <p className="mt-2 text-sm text-[var(--color-text-sub)]">
          프로필 설정 기능은 준비 중입니다.
        </p>
      </Card>

      {/* 로그아웃 */}
      <Card variant="outlined">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">계정</p>
        <Button
          variant="danger"
          size="md"
          fullWidth
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      </Card>
    </PageContainer>
  );
}
```

**완료 기준**
- [ ] `/settings` 접근 및 페이지 렌더링 확인
- [ ] 로그아웃 버튼 → `/login` 이동 확인
- [ ] 모바일 하단 nav → 설정 아이콘 탭 → `/settings` 이동 확인
- [ ] 사이드바 설정 링크 → `/settings` 이동 확인

**커밋**
```
feat(frontend): 설정 페이지 stub 생성 (로그아웃 포함)
```

---

## 꼭지 3: 각 page.tsx에서 PageContainer 교체

**파일들**:
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/journal/page.tsx`
- `src/app/(app)/goals/page.tsx`
- `src/app/(app)/reports/page.tsx`

**교체 패턴**

```diff
- <div className="mx-auto max-w-3xl">
+ <PageContainer size="lg">

- </div>
+ </PageContainer>
```

```diff
- <div className="mx-auto max-w-2xl">
+ <PageContainer size="md">

- </div>
+ </PageContainer>
```

**각 페이지별 size 기준**

| 페이지 | size | 이유 |
|--------|------|------|
| dashboard | `lg` (max-w-3xl) | 데스크톱 2컬럼 그리드 공간 필요 |
| journal | `md` (max-w-2xl) | 카드 리스트형, 넓을 필요 없음 |
| goals | `md` (max-w-2xl) | 카드 리스트형 |
| reports | `lg` (max-w-3xl) | 리포트 카드가 넓음 |

> **주의**: 각 page.tsx에서 레이아웃의 `p-4 sm:p-8`가 제거됐으므로
> PageContainer의 `px-4 py-6 sm:px-6 sm:py-8`이 그 역할을 대신한다.
> 시각적으로 여백이 달라 보일 수 있으면 PageContainer의 py 값을 조정한다.

**완료 기준**
- [ ] 4개 페이지 모두 빌드 에러 없음
- [ ] 각 페이지에서 콘텐츠 최대 너비 제한이 적용됨 확인
- [ ] 가로 스크롤 없음 확인 (375px)
- [ ] `npx tsc --noEmit` 통과

**커밋**
```
refactor(frontend): 앱 페이지들 PageContainer 적용 통일
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin refactor/layout-navigation

gh pr create \
  --base dev \
  --title "[refactor] 레이아웃 & 네비게이션 리팩토링" \
  --body "$(cat <<'EOF'
## 개요
모바일 Safe Area 처리, 하단 탭 UX 개선, 설정 페이지 생성, PageContainer 통일.

## 변경 사항
- [ ] (app)/layout.tsx: 모바일 헤더 추가, safe area padding, 하단 nav 활성 인디케이터
- [ ] (app)/layout.tsx: NAV_ITEMS shortLabel 추가, replace 패턴 제거
- [ ] (app)/layout.tsx: 사이드바 설정 링크 추가
- [ ] settings/page.tsx: stub 생성 (로그아웃 포함)
- [ ] 4개 app 페이지: mx-auto max-w-* → PageContainer 교체

## 테스트
- [ ] 375px 모바일 하단 nav + safe area + 헤더 확인
- [ ] 모바일 로그아웃 동작 확인
- [ ] 기존 4개 탭 이동 정상 확인
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] 기존 라우팅 변경 없음
- [ ] 하위 호환 (기존 사이드바 동작 유지)
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/refactor/layout-navigation" \
  --body "$(cat <<'EOF'
[refactor] 레이아웃 & 네비게이션 리팩토링

- 모바일 헤더(로고+설정 아이콘) 추가
- 하단 nav safe-area-inset-bottom 처리
- 활성 탭 border-t-2 인디케이터 추가
- 설정 페이지 stub (로그아웃 포함)
- 앱 페이지 PageContainer 통일
EOF
)"

git checkout dev && git pull origin dev
git branch -d refactor/layout-navigation

mv prompts/session_13_layout_navigation.md prompts/_complete/
```
