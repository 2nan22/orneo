# Session 12: 공통 UI 컴포넌트 리팩토링

> **세션 목표**: `Button`, `Card`, `Input`, `Toast` 4개 공통 컴포넌트와 신규 `PageContainer`를 리팩토링한다. 이후 모든 화면 개선의 재료가 되는 세션이다.
> **예상 소요**: 2~2.5시간
> **작업량 기준**: 컴포넌트 집중 / 화면 변경 없음 / 타입 안전성 중요
> **브랜치**: `refactor/ui-components` (dev에서 분기)
> **참고 계획서**: `prompts/2026-04-25-ui-dashboard-refactor-plan.md` — Section 4

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

## 꼭지 1: Card.tsx 리팩토링

**파일**: `frontend/src/components/ui/Card.tsx`

**핵심 원칙**: 기존 `padded` prop과 `className`, `children` API는 완전히 유지한다.
신규 props는 모두 optional + 기본값으로 하위 호환을 보장한다.

**추가 스펙**

```typescript
type CardVariant = "default" | "gradient" | "point" | "outlined";
type CardPadding = "sm" | "md" | "lg";  // sm=p-3, md=p-4, lg=p-6

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  // ─── 기존 (유지) ───
  padded?: boolean;       // true면 padding="md" 동작과 동일 (하위호환)

  // ─── 신규 ───
  variant?: CardVariant;  // 기본 "default"
  padding?: CardPadding;  // padded=true가 있으면 padding 무시
  interactive?: boolean;  // hover/active 스타일 + cursor-pointer
  as?: React.ElementType; // 기본 "div"
}
```

**variant별 스타일**

```
default:  bg-card shadow-[var(--shadow-card)] rounded-[var(--radius-xl)]
gradient: bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)]
          text-white shadow-[var(--shadow-card)] rounded-[var(--radius-xl)]
point:    bg-[var(--color-point-light)] border border-[var(--color-point)]
          rounded-[var(--radius-xl)]
outlined: border border-[var(--color-border)] rounded-[var(--radius-xl)]
          (shadow 없음)
```

**interactive 시 추가 스타일**

```
cursor-pointer
transition-transform duration-150
hover:scale-[1.005] active:scale-[0.99]
focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2
```

**완료 기준**
- [ ] 기존 모든 사용처 (`dashboard`, `journal`, `goals`, `reports`, `onboarding`) 빌드 에러 없음
- [ ] `variant="gradient"` 카드에서 흰 텍스트가 배경과 구분됨 확인
- [ ] `interactive` 카드 클릭 시 scale 애니메이션 확인
- [ ] `as="article"` 로 렌더링 시 실제 article 태그 출력 확인

**커밋**
```
refactor(frontend): Card 컴포넌트 variant·padding·interactive·as prop 추가
```

---

## 꼭지 2: Button.tsx 리팩토링

**파일**: `frontend/src/components/ui/Button.tsx`

**기존 API 완전 유지**: `variant`, `loading`, `disabled`, `className`, `children`

**추가 스펙**

```typescript
type Variant = "primary" | "outline" | "ghost" | "danger" | "point";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;     // 기본 "primary"
  size?: ButtonSize;     // 기본 "md"
  loading?: boolean;
  fullWidth?: boolean;   // w-full 추가 여부
}
```

**size별 스타일**

```
sm:   px-3 py-2 text-xs rounded-[var(--radius-md)] min-h-[36px]
md:   px-4 py-3 text-sm rounded-[var(--radius-lg)]              (기존과 동일)
lg:   px-6 py-4 text-base rounded-[var(--radius-lg)]
icon: h-11 w-11 p-0 rounded-[var(--radius-full)] (최소 44px 터치 타깃)
```

**신규 variant 스타일**

```
danger: bg-[var(--color-danger)] text-white
        hover:opacity-90 active:opacity-80

point:  bg-[var(--color-point)] text-white
        hover:opacity-90 active:opacity-80
```

**접근성 및 터치 UX 추가**

```tsx
<button
  disabled={disabled || loading}
  aria-busy={loading}
  aria-disabled={disabled || loading}
  className={[
    // ... 기존 스타일
    "touch-manipulation",           // 더블탭 줌 방지
    "active:scale-[0.97]",          // 눌림 피드백
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-[var(--color-primary)]",
    "focus-visible:ring-offset-2",
    fullWidth ? "w-full" : "",
  ].join(" ")}
>
```

> **주의**: `danger` variant의 `focus-visible` ring은 `ring-[var(--color-danger)]`으로 변경.
> `icon` size에서 children이 텍스트인 경우 레이아웃 깨짐 — 아이콘 SVG만 넣도록 주석으로 가이드 추가.

**완료 기준**
- [ ] 5가지 variant 모두 시각적으로 구분됨
- [ ] `size="icon"` 버튼이 44×44px 이상임
- [ ] `loading=true` 시 `aria-busy="true"` 속성 확인 (DevTools)
- [ ] 키보드 Tab 포커스 시 ring 표시, 마우스 클릭 시 ring 미표시
- [ ] `npm run build` + `npx tsc --noEmit` 통과

**커밋**
```
refactor(frontend): Button 컴포넌트 size·danger·point variant·a11y 개선
```

---

## 꼭지 3: Input.tsx 리팩토링

**파일**: `frontend/src/components/ui/Input.tsx`

**기존 API 완전 유지**: `label`, `error`, `id`, `className`, HTMLInputAttributes

**추가 스펙**

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;          // 에러 아닌 안내 메시지
  prefix?: React.ReactNode;     // 좌측 아이콘/텍스트
  suffix?: React.ReactNode;     // 우측 아이콘/텍스트 (예: "원")
  success?: boolean;            // 유효성 통과 시 녹색 테두리
}
```

> **multiline prop 판단**: `<textarea>`와 `<input>`의 TypeScript 타입이 서로 달라
> 단일 컴포넌트 내 분기가 복잡해진다. 이번 세션에서는 `multiline`을 생략하고
> 별도 `Textarea.tsx`를 신설한다. 기존 textarea 사용처가 없으면 stub만 만든다.

**구현 포인트**

```tsx
// useId로 id 자동 생성 (label-input 연결 보장)
const autoId = useId();
const inputId = id ?? autoId;

// prefix/suffix 있을 때 relative wrapper + padding 조정
<div className="relative">
  {prefix && (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sub)]">
      {prefix}
    </div>
  )}
  <input
    id={inputId}
    aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
    className={[
      // ... 기존 스타일
      prefix ? "pl-10" : "",
      suffix ? "pr-10" : "",
      success ? "border-[var(--color-success)] focus-visible:ring-[var(--color-success)]" : "",
      // focus → focus-visible 로 변경
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
    ].join(" ")}
  />
  {suffix && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sub)]">
      {suffix}
    </div>
  )}
</div>

{/* error */}
{error && <p id={`${inputId}-error`} role="alert" className="text-xs text-[var(--color-danger)]">{error}</p>}
{/* helperText */}
{!error && helperText && <p id={`${inputId}-helper`} className="text-xs text-[var(--color-text-sub)]">{helperText}</p>}
```

**온보딩 Step1 인라인 suffix 교체**
`onboarding/page.tsx`의 Step1에서 "원" suffix를 직접 구현한 `<span>` 대신
`<Input suffix={<span>원</span>} ...>` 로 교체한다.

**완료 기준**
- [ ] `label` 없이 `id` 미전달 시에도 label-input 연결 확인 (DevTools → Accessibility)
- [ ] `prefix`/`suffix` 렌더링 및 input padding 조정 확인
- [ ] `error` 있을 때 `role="alert"` 확인
- [ ] 마우스 클릭 시 ring 미표시, 키보드 Tab 시 ring 표시 확인
- [ ] 온보딩 Step1 suffix 교체 후 빌드 통과

**커밋**
```
refactor(frontend): Input 컴포넌트 prefix·suffix·helperText·useId·a11y 개선
```

---

## 꼭지 4: Toast.tsx 개선 & PageContainer 신설

### 4-1. Toast.tsx 개선

**파일**: `frontend/src/components/ui/Toast.tsx`

**기존 API 완전 유지**: `message`, `onDismiss`, `duration`

**추가 스펙**

```typescript
type ToastType = "default" | "success" | "error" | "warning" | "info";

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
  type?: ToastType;  // 기본 "default"
}
```

**타입별 스타일**

```
default: bg-[var(--color-text)] text-white               (기존과 동일)
success: bg-[var(--color-success)] text-white
error:   bg-[var(--color-danger)] text-white
warning: bg-[var(--color-warning)] text-white
info:    bg-[var(--color-primary)] text-white
```

**접근성 추가**

```tsx
<div
  role={type === "error" ? "alert" : "status"}
  aria-live={type === "error" ? "assertive" : "polite"}
  aria-atomic="true"
  className={[
    "fixed left-1/2 z-50 -translate-x-1/2",
    // 모바일: 하단 nav(64px) + safe-area + 여유 8px 위에 위치
    "bottom-[calc(64px+env(safe-area-inset-bottom)+8px)]",
    // 데스크톱: 기존 bottom-6
    "sm:bottom-6",
    "rounded-[var(--radius-xl)] px-5 py-3 shadow-[var(--shadow-modal)]",
    typeStyles[type ?? "default"],
  ].join(" ")}
>
  <p className="text-sm font-medium">{message}</p>
</div>
```

### 4-2. PageContainer.tsx 신설

**파일**: `frontend/src/components/ui/PageContainer.tsx` (신규)

각 page.tsx에서 반복되는 `mx-auto max-w-*` + `p-4 sm:p-8` 패턴을 통일한다.

```typescript
// frontend/src/components/ui/PageContainer.tsx
interface PageContainerProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";  // sm=max-w-xl, md=max-w-2xl, lg=max-w-3xl
  className?: string;
}

const sizeMap = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

export default function PageContainer({
  children,
  size = "md",
  className = "",
}: PageContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full px-4 py-6 sm:px-6 sm:py-8",
        sizeMap[size],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
```

**완료 기준**
- [ ] Toast: 5가지 타입 색상 시각 확인
- [ ] Toast: 모바일 375px에서 하단 nav 위에 표시됨 확인
- [ ] Toast: DevTools → Accessibility에서 `role="status"` / `role="alert"` 확인
- [ ] PageContainer: size 3가지 max-w 적용 확인
- [ ] `npm run build` + `npx tsc --noEmit` 통과
- [ ] 기존 Toast 사용처 빌드 에러 없음

**커밋**
```
refactor(frontend): Toast 타입·ARIA·위치 개선 및 PageContainer 신설
```

---

## 세션 완료 후

```bash
# 최종 빌드 확인
cd frontend && npm run build && npx tsc --noEmit

# 원격 push
git push origin refactor/ui-components

# PR 생성
gh pr create \
  --base dev \
  --title "[refactor] 공통 UI 컴포넌트 리팩토링" \
  --body "$(cat <<'EOF'
## 개요
Button, Card, Input, Toast 4개 공통 컴포넌트를 개선하고 PageContainer를 신설한다.
기존 API는 모두 하위 호환 유지.

## 변경 사항
- [ ] Card: variant(4종)·padding·interactive·as prop 추가
- [ ] Button: size(4종)·danger·point variant·aria-busy·focus-visible·touch-manipulation 추가
- [ ] Input: prefix·suffix·helperText·useId 자동 생성·focus-visible·aria-describedby 추가
- [ ] Toast: type(5종)·ARIA role·모바일 위치 개선
- [ ] PageContainer: 신규 생성 (size 3종)
- [ ] 온보딩 Step1 suffix 인라인 구현 → Input suffix prop 교체

## 테스트
- [ ] 기존 dashboard·journal·goals·reports·onboarding 페이지 빌드 에러 없음
- [ ] npm run build 통과
- [ ] npx tsc --noEmit 통과

## 체크리스트
- [ ] 기존 컴포넌트 API 하위 호환 유지
- [ ] 접근성 속성 추가 (aria-busy, aria-describedby, role, aria-live)
- [ ] 터치 타깃 44px 이상
EOF
)"

# PR 머지
gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/refactor/ui-components" \
  --body "$(cat <<'EOF'
[refactor] 공통 UI 컴포넌트 리팩토링

- Card variant(4종)·interactive·as prop 추가
- Button size(4종)·danger/point variant·a11y 강화
- Input prefix/suffix·helperText·useId·focus-visible 개선
- Toast type(5종)·ARIA·모바일 위치 개선
- PageContainer 신설 (size sm/md/lg)
EOF
)"

# dev 동기화 + 로컬 브랜치 삭제
git checkout dev && git pull origin dev
git branch -d refactor/ui-components

# 세션 완료 처리
mv prompts/session_12_ui_components.md prompts/_complete/
```
