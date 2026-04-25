# Session 11: 기반 환경 정비 & 디자인 토큰

> **세션 목표**: UI 리팩토링 전 기반을 다진다. 폰트 로딩을 정상화하고, 전역 CSS 변수를 완성형 디자인 시스템 토큰으로 확장한다.
> **예상 소요**: 1~1.5시간
> **작업량 기준**: 설정·스타일 중심 / 화면 변경 없음
> **브랜치**: `refactor/design-tokens` (dev에서 분기)
> **참고 계획서**: `prompts/2026-04-25-ui-dashboard-refactor-plan.md` — Section 3

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

## 꼭지 1: Phase 0 — 브랜치 생성 & 현황 파악

**현재 상태 확인 후 작업을 시작한다.**

```bash
# 1. dev 최신 상태 확인
git checkout dev && git pull origin dev

# 2. 리팩토링 브랜치 생성
git checkout -b refactor/design-tokens

# 3. 빌드 현황 확인
cd frontend
npm run build

# 4. 타입 오류 현황 확인
npx tsc --noEmit

# 5. 스크린샷 디렉터리 생성
mkdir -p ../prompts/screenshots/before
```

**Before 스크린샷 촬영 목록** (브라우저 DevTools → Device: 375px / 1280px 각각)
- `/dashboard`
- `/journal`
- `/goals`
- `/reports`
- `/onboarding` (Step 1)

스크린샷은 `prompts/screenshots/before/` 폴더에 저장한다.
(Claude Code에서 직접 촬영이 어려운 경우 수동으로 저장 후 계속 진행)

**확인 사항 체크**
- [ ] `npm run build` 통과 여부 확인
- [ ] `npx tsc --noEmit` 타입 에러 건수 기록 (0이면 이상적)
- [ ] 현재 `package.json`에 `lint` 스크립트 없음 확인 → 추가 여부 판단

> **참고**: `package.json`에 lint·typecheck 스크립트가 없다. ESLint 설정도 없는 상태.
> 이번 세션에서 추가하지 않고 현황만 기록한다. (별도 `chore` 세션 또는 Session 16에서 처리)

**커밋**
```
chore(frontend): UI 리팩토링 전 빌드 현황 확인 및 브랜치 생성
```

---

## 꼭지 2: globals.css — 디자인 토큰 확장

`frontend/src/app/globals.css`에 신규 토큰을 추가한다.
**기존 변수명은 절대 변경하지 않는다.** 신규 토큰만 추가한다.

**변경 내용**

`:root` 블록에 다음을 추가한다:

```css
/* ─── 기존 변수 (변경 금지) ─── */
/* --color-primary, --color-primary-end, --color-point, ... 그대로 유지 */

/* ─── 신규 색상 토큰 ─── */
--color-primary-light: #eff6ff;   /* 선택된 버튼/카드 배경 */
--color-point-light:   #ecfdf9;   /* point 계열 연한 배경 */
--color-danger:        #ef4444;   /* 에러·삭제 */
--color-danger-light:  #fef2f2;
--color-success:       #22c55e;
--color-warning:       #f59e0b;

/* ─── 그림자 토큰 ─── */
--shadow-card:  0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04);
--shadow-modal: 0 10px 40px -4px rgb(0 0 0 / 0.14);
--shadow-fab:   0 4px 16px 0 rgb(37 99 235 / 0.30);

/* ─── Radius 토큰 ─── */
--radius-sm:   8px;
--radius-md:   12px;
--radius-lg:   16px;
--radius-xl:   20px;
--radius-full: 9999px;

/* ─── Dark mode 예약 (미구현 — 나중을 위한 자리만 확보) ─── */
/* @media (prefers-color-scheme: dark) { :root { ... } } */
```

`@theme inline` 블록에 다음을 추가한다:

```css
/* 기존 매핑 유지 + 아래 추가 */
--color-primary-end:   var(--color-primary-end);
--color-primary-light: var(--color-primary-light);
--color-point-light:   var(--color-point-light);
--color-danger:        var(--color-danger);
--color-danger-light:  var(--color-danger-light);
--color-success:       var(--color-success);
--color-warning:       var(--color-warning);
--shadow-card:         var(--shadow-card);
--shadow-modal:        var(--shadow-modal);
--shadow-fab:          var(--shadow-fab);
--radius-sm:           var(--radius-sm);
--radius-md:           var(--radius-md);
--radius-lg:           var(--radius-lg);
--radius-xl:           var(--radius-xl);
--radius-full:         var(--radius-full);
```

**완료 기준**
- [ ] 브라우저 DevTools → Elements → `:root`에서 신규 변수 확인
- [ ] `npm run build` 통과 (CSS 변경이므로 빌드 깨짐 없어야 함)
- [ ] 기존 화면 색상 변화 없음 (신규 토큰은 아직 미사용 상태)

**커밋**
```
chore(frontend): globals.css 디자인 토큰 확장 (색상·그림자·radius)
```

---

## 꼭지 3: Pretendard 폰트 로딩 & layout.tsx 개선

**현재 문제**: `globals.css`에서 `font-family: "Pretendard Variable"` 참조만 있고,
실제 폰트 파일 로딩 코드가 `layout.tsx`에 없다. 시스템 폰트로 fallback 중.

### 3-1. Pretendard 폰트 파일 준비

```bash
# public/fonts/ 디렉터리 생성
mkdir -p frontend/public/fonts
```

> **폰트 파일 획득 방법 (수동)**
> 1. https://github.com/orioncactus/pretendard/releases 에서 최신 릴리즈 다운로드
> 2. `PretendardVariable.woff2` (서브셋: 한글 포함 가변 폰트) 파일을
>    `frontend/public/fonts/PretendardVariable.woff2` 에 위치
>
> 파일이 없으면 이 꼭지는 일단 `.env` 플래그로 분기 처리하고 스킵 가능.
> 폰트 없이도 나머지 코드 변경은 진행할 수 있다.

### 3-2. layout.tsx 수정

```typescript
// frontend/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "ORNEO — 오늘의 선택으로, 더 나은 나를.",
  description: "금융·자기계발·주거를 하나의 자본 운용 대시보드로",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",   // iOS safe area 활성화
  themeColor: "#2563EB",  // 모바일 브라우저 상단바 색상
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

### 3-3. globals.css font-family 업데이트

```css
/* body 선언에서 font-family를 CSS 변수로 변경 */
body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-pretendard), "Pretendard Variable", "Pretendard",
               Arial, Helvetica, sans-serif;
}
```

**완료 기준**
- [ ] 폰트 파일이 있는 경우: DevTools Network 탭에서 `PretendardVariable.woff2` 로드 확인
- [ ] 폰트 파일이 없는 경우: 빌드는 통과하고, `next/font/local` 오류가 없어야 함
  (없으면 path를 optional로 처리하거나 CDN 방식으로 대체)
- [ ] iOS Safari에서 `viewport-fit=cover` 적용 확인 (safe area 생기는지)
- [ ] `npm run build` 통과
- [ ] `npx tsc --noEmit` 타입 에러 없음

> **주의**: `next/font/local`에서 폰트 파일 경로가 잘못되면 빌드 에러.
> 파일이 없는 경우 대안: CDN 링크를 `layout.tsx`의 `<head>`에 직접 삽입하는 방식 사용.
> ```tsx
> // 폰트 파일 없을 때 임시 대안
> // <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.min.css" />
> ```

**커밋**
```
chore(frontend): Pretendard 폰트 로딩 및 viewport 설정 개선
```

---

## 세션 완료 후

```bash
# frontend 디렉터리에서 최종 빌드 확인
cd frontend && npm run build && npx tsc --noEmit

# 원격 push
git push origin refactor/design-tokens

# PR 생성 (--base dev 필수)
gh pr create \
  --base dev \
  --title "[chore] 디자인 토큰 확장 및 폰트 로딩 정상화" \
  --body "$(cat <<'EOF'
## 개요
UI 리팩토링의 기반이 되는 디자인 토큰과 폰트 환경을 정비한다.

## 변경 사항
- [ ] globals.css: 신규 색상·그림자·radius 토큰 추가 (기존 변수명 유지)
- [ ] layout.tsx: next/font/local로 Pretendard 폰트 로딩 추가
- [ ] layout.tsx: viewport 설정 (viewportFit: cover, themeColor) 추가

## 테스트
- [ ] npm run build 통과
- [ ] npx tsc --noEmit 통과
- [ ] 기존 화면 색상/레이아웃 변화 없음 확인

## 체크리스트
- [ ] 기존 CSS 변수명 변경 없음
- [ ] 환경변수 하드코딩 없음
EOF
)"

# PR 머지
gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/refactor/design-tokens" \
  --body "$(cat <<'EOF'
[chore] 디자인 토큰 확장 및 폰트 로딩 정상화

- globals.css 신규 색상·그림자·radius 토큰 추가
- Pretendard 폰트 next/font/local 로딩 적용
- viewport viewportFit:cover + themeColor 설정
EOF
)"

# dev 동기화 + 로컬 브랜치 삭제
git checkout dev && git pull origin dev
git branch -d refactor/design-tokens

# 세션 완료 처리
mv prompts/session_11_design_tokens.md prompts/_complete/
```
