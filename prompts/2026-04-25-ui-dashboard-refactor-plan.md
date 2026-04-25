# ORNEO UI & Dashboard Refactor Plan

> 작성일: 2026-04-25
> 작성자: Senior Frontend / UI·UX Architect (AI)
> 대상 브랜치: `main` (MVP 완료 이후 단계)
> 프로젝트 경로: `/Users/2nan/Documents/private/orneo/frontend`

---

## 1. 목적

### 이번 리팩토링의 목표

MVP 완성 이후 코드가 동작 가능한 상태에서, 사용자에게 **제품이 전달하는 핵심 가치를 UI로 명확하게 표현**하는 것이 목표다. 구체적으로는 아래 세 가지를 달성한다.

1. **디자인 시스템 통일**: 현재 색상 토큰은 `globals.css`에 있지만, 타이포그래피·간격·반경·그림자 등 나머지 스케일이 정의되어 있지 않다. 이를 Tailwind v4 기준 `@theme` 블록으로 완성한다.
2. **공통 컴포넌트 완성도 향상**: `Button`, `Card`, `Input`, `Toast` 4개 컴포넌트가 있으나 variant 다양성, 접근성, 모바일 터치 UX가 부족하다. 이후 화면 개선의 기반이 될 수 있도록 먼저 정리한다.
3. **대시보드 정보 구조 재설계**: 현재 대시보드는 점수 → 질문 → 행동 순서로 올바르게 배치되어 있으나, 모바일 첫 화면에서 "지금 무엇을 해야 하는지"가 즉시 보이지 않는다. "오늘 할 행동"이 스크롤 없이 노출되도록 재구성한다.

### MVP 이후 지금 UI/대시보드 정리가 필요한 이유

- 현재 공통 컴포넌트 4개는 기능적으로 동작하지만 variant가 1~2개에 불과해, 다음 화면을 만들 때 인라인 className이 중복 생산되는 구조적 문제가 있다.
- `globals.css`에 타이포그래피 스케일과 그림자 정의가 없기 때문에, 각 화면이 임의의 `text-sm`, `text-2xl`, `shadow-sm`을 직접 하드코딩하고 있다. 일관성을 잃기 시작한 단계다.
- 기능이 더 추가되기 전에 레이아웃과 컴포넌트를 정리해두지 않으면, 각 페이지가 서로 다른 패턴을 따라가게 된다.

### 제품 포지셔닝과 연결되는 UX 방향

ORNEO의 슬로건은 "오늘의 선택으로, 더 나은 나를."이다. 핵심 UX 루프는 `목표 설정 → 오늘의 상태 → AI 요약 → 오늘 행동 1~3개 → 주간 복기`다. 이 루프에서 사용자가 앱을 열었을 때 **가장 먼저 봐야 하는 것은 "오늘 무엇을 해야 하는가"** 이다. 현재 대시보드는 점수 게이지가 시각적으로 가장 크고, 행동 목록은 스크롤 후 보인다. 이 순서를 바꾸는 것이 이번 리팩토링의 UX 핵심이다.

---

## 2. 현재 구조 분석

### `src/app/globals.css`

**현재 역할**  
Tailwind v4 import, CSS Custom Properties(색상 토큰 7개), `@theme inline` 블록으로 Tailwind 유틸리티 매핑, `body` 기본 스타일(배경색·텍스트색·Pretendard 폰트).

**개선 필요 지점**

- 폰트(`Pretendard Variable`)가 body CSS에서 참조되지만, `layout.tsx`에 `<link>` 또는 `next/font` 로딩이 없다. 폰트가 실제로 로드되지 않을 수 있다.
- 색상 토큰 외 **타이포그래피 스케일, 간격 스케일, border-radius 스케일, 그림자/elevation 스케일**이 전혀 없다. 각 파일이 `text-sm`, `text-2xl`, `rounded-xl`, `rounded-2xl`, `shadow-sm` 등을 각자 직접 사용하고 있다.
- `--color-primary-end`가 `@theme inline`에 매핑되지 않아, `bg-primary-end` 같은 유틸리티 클래스를 쓸 수 없다. 현재는 모두 `bg-[var(--color-primary-end)]` 방식으로 인라인 사용 중.
- dark mode 토큰 없음 (지금은 미지원이지만 나중을 위한 `prefers-color-scheme` 구조 준비가 필요함).

**리팩토링 시 주의할 점**  
`@theme inline`의 `--color-*` 이름이 Tailwind v4에서 `bg-*`, `text-*` 유틸리티로 매핑된다. 이름을 바꾸면 기존 `bg-primary` 등의 클래스가 동작하지 않으므로, **기존 토큰 이름은 유지하고 신규 토큰만 추가**하는 방식으로 진행한다.

**다른 화면에 미칠 영향**  
모든 컴포넌트와 페이지가 이 파일의 CSS 변수를 직접 참조하므로, 변수명 변경은 전면 영향. 변수 추가는 영향 없음.

---

### `src/app/layout.tsx`

**현재 역할**  
루트 레이아웃. `<html lang="ko">`, `antialiased`, `min-h-full flex flex-col` body, Metadata 설정.

**개선 필요 지점**

- `globals.css`의 Pretendard 폰트가 실제로 로드되지 않는다. CDN을 통한 `<link>` 태그나 `next/font/local`을 이용한 로컬 폰트 로딩이 필요하다.
- OG(Open Graph) meta tag 없음. 공유 시 미리보기가 없다.
- `<meta name="viewport">` 명시 없음 (Next.js가 기본 추가하지만, `viewport-fit=cover`를 명시해야 iOS safe area가 적용된다).
- `<meta name="theme-color">` 없음. 모바일 브라우저 상단바 색상 미적용.

**리팩토링 시 주의할 점**  
`next/font/local`로 Pretendard를 추가할 경우, `variable` 옵션으로 CSS 변수를 정의하고 `<html>` className에 붙이는 패턴을 사용한다. `body`의 `font-family`는 그 CSS 변수를 참조하도록 변경.

**다른 화면에 미칠 영향**  
폰트 추가는 전체 화면에 영향. `viewport-fit=cover` 추가는 iOS safe area 처리에 영향 (긍정적).

---

### `src/app/(app)/layout.tsx`

**현재 역할**  
인증 이후 앱 내 공통 레이아웃. 좌측 사이드바(desktop), 하단 탭 네비게이션(mobile), 메인 콘텐츠 영역.

**개선 필요 지점**

- **브레이크포인트 불일치**: 사이드바는 `sm:flex`(640px), 하단 nav는 `sm:hidden`(640px)이다. 설계 목표는 375px 모바일이지만, 375~640px 구간에서는 사이드바가 없고 하단 nav도 없는 **레이아웃 공백 구간**이 생긴다.
- **Safe area 미처리**: iOS 하단 홈 인디케이터 영역(`env(safe-area-inset-bottom)`)이 고려되지 않았다. 하단 nav 버튼이 홈 인디케이터에 가려질 수 있다.
- **하단 nav 레이블 수동 절삭**: `label.replace("의사결정 ", "")` 방식으로 레이블을 잘라내고 있다. 별도 `shortLabel` 필드를 `NAV_ITEMS`에 추가하는 것이 깔끔하다.
- **로그아웃이 사이드바에만 있고 모바일에는 없다.** 모바일에서 로그아웃할 방법이 없음. 설정 페이지 또는 네비에 추가 필요.
- **활성 상태 표시**: 하단 nav에서 활성 탭은 색상만 다르고 명확한 인디케이터(상단 라인, dot 등)가 없다.
- **설정/프로필 페이지 없음**: NAV_ITEMS에 설정 항목이 없고 해당 페이지 파일도 없다.
- **메인 컨테이너 padding**: `p-4 sm:p-8`로 정의되어 있지만, `max-w-*` 제한이 없다. 각 페이지가 직접 `max-w-3xl` 등을 선언해야 한다. 공통 페이지 컨테이너 래퍼 컴포넌트가 필요하다.

**리팩토링 시 주의할 점**  
NAV_ITEMS 구조 변경은 컴파일 타임 타입 에러로 즉시 감지 가능. 브레이크포인트 변경 시 모든 반응형 스타일을 재검토해야 함.

**다른 화면에 미칠 영향**  
모든 `(app)` 하위 화면에 직접 영향. 레이아웃 변경은 반드시 전체 화면 회귀 테스트 필요.

---

### `src/components/ui/Button.tsx`

**현재 역할**  
`primary` / `outline` / `ghost` 3가지 variant, `loading` prop, disabled 상태 지원.

**개선 필요 지점**

- **size prop 없음**: 현재 `px-4 py-3 text-sm`으로 고정. `sm` (compact, 터치 타깃 최소), `md` (기본), `lg` (풀 너비용) 구분이 필요하다.
- **`danger` variant 없음**: 삭제·경고성 액션에 쓸 빨간 계열 버튼이 없어 현재 인라인 override를 해야 한다.
- **`focus-visible` ring 없음**: 키보드 포커스 표시가 없다. `focus-visible:ring-2 focus-visible:ring-offset-2` 추가 필요.
- **`aria-busy` 미설정**: `loading=true`일 때 `aria-busy="true"`를 추가해야 스크린리더에서 로딩 상태를 인식한다.
- **터치 타깃**: `py-3`이면 약 44px 높이를 만족하나, `sm` size에서는 확인 필요.
- **icon-only 버튼 미지원**: FAB이나 아이콘 버튼을 `Button`으로 처리할 수 없어 각 페이지에서 직접 구현하고 있다 (예: goals/page.tsx의 FAB).

**다른 화면에 미칠 영향**  
모든 화면의 버튼이 이 컴포넌트를 사용. `size` prop 추가는 기본값 설정으로 하위 호환 가능.

---

### `src/components/ui/Card.tsx`

**현재 역할**  
`padded` prop 하나만 있는 최소 카드 컨테이너. `rounded-2xl`, `bg-card`, `shadow-sm`.

**개선 필요 지점**

- **variant 없음**: 프로토타입에서 요구하는 "라이프 캐피털 점수 카드"처럼 그라디언트 배경 카드, "오늘의 핵심 질문"처럼 포인트 컬러 강조 카드, 일반 흰 카드를 같은 `Card` 컴포넌트에서 처리할 수 없다.
- **interactive (클릭 가능) 상태 없음**: 카드 전체가 링크나 버튼처럼 동작해야 할 때 스타일 처리가 없다. 현재는 인라인으로 `hover:` 스타일을 추가하거나 Card를 사용하지 않는다.
- **header/footer 슬롯 없음**: 카드 상단에 아이콘·타이틀, 하단에 CTA 버튼을 배치하는 패턴이 반복되지만, Card가 이를 지원하지 않아 각 화면이 직접 내부 구조를 만든다.
- **`as` prop 없음**: `<article>`, `<section>` 등 시맨틱 태그 변경 불가.

**다른 화면에 미칠 영향**  
`variant` 추가는 기본값 설정으로 하위 호환 가능. `as` prop은 신규 기능이므로 기존 코드에 영향 없음.

---

### `src/components/ui/Input.tsx`

**현재 역할**  
`label`, `error` prop 지원. `focus:ring-2`, border 색상 error 분기 처리.

**개선 필요 지점**

- **`prefix` / `suffix` 슬롯 없음**: 온보딩 Step1에서 "원" 단위 표기를 `<span className="absolute right-4 ...">원</span>`으로 직접 구현하고 있다. Input 컴포넌트가 이를 지원해야 한다.
- **`helperText` prop 없음**: error가 아닌 안내 메시지를 표시할 방법이 없다.
- **`textarea` 미지원**: 의사결정 일지 작성 폼에서 textarea가 필요한데, 별도 구현이 되어 있을 것이다. `multiline` prop으로 통합 가능.
- **`success` 상태 없음**: 유효성 검사 통과 시 시각적 피드백이 없다.
- **`focus-visible` 처리**: `focus:outline-none focus:ring-2`로 되어 있어 마우스 클릭 시에도 링이 표시된다. `focus-visible:ring-2`로 변경 필요.
- **autoComplete / id 연결**: `label`의 `htmlFor`와 `input`의 `id`가 동일해야 하는데, `id`가 외부에서 주입되어야만 작동한다. `id` 미전달 시 접근성이 깨진다.

**다른 화면에 미칠 영향**  
`prefix`/`suffix` 추가는 기존 사용처에 영향 없음. `focus-visible` 변경은 시각적 변화 있음 (키보드 전용으로 ring이 제한됨). `id` 자동 생성 로직 추가 시 영향 없음.

---

### `src/components/ui/Toast.tsx`

**현재 역할**  
고정 위치 다크 배경 토스트. `message`, `onDismiss`, `duration` props. `useEffect`로 자동 닫힘.

**개선 필요 지점**

- **type 없음**: `success` / `error` / `warning` / `info` 타입 분기가 없어 모든 토스트가 같은 다크 스타일이다. 현재 에러도 동일하게 표시된다.
- **아이콘 없음**: 타입별 아이콘이 없어 빠른 인식이 어렵다.
- **ARIA role 없음**: `role="status"` 또는 `role="alert"`가 없어 스크린리더가 인식하지 못한다.
- **하단 nav 충돌**: 모바일에서 Toast가 `bottom-6`이고 하단 nav가 `fixed bottom-0`이므로 nav 위에 토스트가 표시되지 않는다. 하단 nav 높이(약 64px)를 더한 `bottom` 값이 필요하다.
- **action 버튼 없음**: "실행 취소" 같은 인라인 액션을 지원하지 않는다.
- **스택 관리 없음**: Toast를 여러 개 동시에 띄울 수 없다. 토스트 큐 관리를 위한 Context/hook 패턴으로 전환을 고려해야 한다.

**다른 화면에 미칠 영향**  
현재 Toast의 `onDismiss` / `duration` API는 유지. `type` prop 기본값을 `"default"`로 설정하면 하위 호환. 위치 조정은 모바일에서 시각적으로 변경됨.

---

## 3. 브랜드 디자인 시스템 제안

### Tailwind CSS v4 기준 색상 토큰 설계

`globals.css`의 `:root`와 `@theme inline` 블록에 아래를 추가/보완한다.

```css
/* globals.css — :root 추가 항목 */
:root {
  /* ─── 기존 유지 ─── */
  --color-primary:     #2563EB;
  --color-primary-end: #0C2AA8;
  --color-point:       #00C2A8;
  --color-text:        #0B132B;
  --color-text-sub:    #334155;
  --color-border:      #E2E8F0;
  --color-bg:          #F1F5F9;
  --color-card:        #FFFFFF;

  /* ─── 신규 추가 ─── */
  --color-primary-light: #EFF6FF;   /* 선택된 버튼/카드 배경용 */
  --color-point-light:   #ECFDF9;   /* point 계열 연한 배경 */
  --color-danger:        #EF4444;   /* 에러/삭제 */
  --color-danger-light:  #FEF2F2;
  --color-success:       #22C55E;
  --color-warning:       #F59E0B;

  /* ─── 그림자 토큰 ─── */
  --shadow-card:   0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --shadow-modal:  0 10px 40px -4px rgb(0 0 0 / 0.14);
  --shadow-fab:    0 4px 16px 0 rgb(37 99 235 / 0.30);

  /* ─── Radius 토큰 ─── */
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   16px;
  --radius-xl:   20px;
  --radius-full: 9999px;
}

@theme inline {
  /* ─── 기존 유지 ─── */
  --color-primary:     var(--color-primary);
  --color-point:       var(--color-point);
  --color-text:        var(--color-text);
  --color-text-sub:    var(--color-text-sub);
  --color-border:      var(--color-border);
  --color-bg:          var(--color-bg);
  --color-card:        var(--color-card);

  /* ─── 신규 추가 ─── */
  --color-primary-end:   var(--color-primary-end);
  --color-primary-light: var(--color-primary-light);
  --color-point-light:   var(--color-point-light);
  --color-danger:        var(--color-danger);
  --color-danger-light:  var(--color-danger-light);
  --color-success:       var(--color-success);
  --color-warning:       var(--color-warning);

  /* ─── 그림자 ─── */
  --shadow-card:  var(--shadow-card);
  --shadow-modal: var(--shadow-modal);
  --shadow-fab:   var(--shadow-fab);

  /* ─── Radius ─── */
  --radius-sm:   var(--radius-sm);
  --radius-md:   var(--radius-md);
  --radius-lg:   var(--radius-lg);
  --radius-xl:   var(--radius-xl);
  --radius-full: var(--radius-full);
}
```

### Typography Scale

Pretendard 폰트 기준. `next/font/local`로 로드 후 `--font-pretendard` CSS 변수 정의.

| 토큰명 | 용도 | size / weight / line-height |
|---|---|---|
| `display` | 온보딩 히어로 | 28px / 800 / 1.2 |
| `heading-1` | 페이지 제목 (h1) | 22px / 700 / 1.3 |
| `heading-2` | 섹션 제목 (h2) | 18px / 600 / 1.4 |
| `heading-3` | 카드 제목 | 15px / 600 / 1.4 |
| `body-md` | 본문 기본 | 14px / 400 / 1.6 |
| `body-sm` | 보조 텍스트 | 13px / 400 / 1.5 |
| `label` | 레이블, 뱃지 | 12px / 500 / 1.0 |
| `caption` | 날짜, 메타 정보 | 11px / 400 / 1.4 |

현재 각 화면에서 `text-2xl`, `text-sm`, `text-xs`를 직접 사용하고 있다. 단기적으로는 토큰을 `@theme inline`에 추가하고, 화면 리팩토링 시 점진적으로 교체한다.

### Radius Scale

```
--radius-sm   →  rounded-sm  (8px)   소형 뱃지, 태그
--radius-md   →  rounded-md  (12px)  인풋, 소형 카드
--radius-lg   →  rounded-lg  (16px)  카드 기본
--radius-xl   →  rounded-xl  (20px)  모달, 대형 카드
--radius-full →  rounded-full        FAB, 칩
```

현재 `rounded-xl`, `rounded-2xl`이 혼용 중. `rounded-2xl`(24px)은 `--radius-xl`(20px)로 통일한다.

### Shadow / Elevation Scale

```
shadow-card    →  카드 기본 (subtle)
shadow-modal   →  모달, 드롭다운 (elevated)
shadow-fab     →  FAB 버튼 (branded, 파란 그림자)
```

현재 `shadow-sm`, `shadow-lg`가 혼용 중. 위 3개 토큰으로 통일.

### Spacing 기준

Tailwind 기본 spacing을 유지하되, 화면 내 주요 간격에 대한 가이드라인을 코드 주석으로 명문화한다.

```
페이지 수평 패딩:   px-4 (16px, 모바일)   px-6 (24px, 태블릿 이상)
카드 내부 패딩:     p-4 (16px, 기본)       p-6 (24px, 데스크톱 wide)
카드 간 세로 간격:  gap-3 (12px)
섹션 간 간격:       gap-6 (24px)
```

### Mobile-first Layout 기준

- 기준 너비: **375px** (iPhone SE/13 mini 기준)
- 콘텐츠 최대 너비: 모바일 `100%`, 데스크톱 `max-w-3xl` (768px, 대시보드), `max-w-2xl` (640px, 폼/리스트)
- 공통 페이지 래퍼 컴포넌트 `PageContainer`를 신설해 `max-w-*`, `mx-auto`, `px-*`를 일원화한다.

### Dark Mode 판단

**현재 단계에서는 dark mode를 구현하지 않는다.** 이유:

1. 폰트 로딩, 디자인 시스템 기반도 아직 완성되지 않은 상태에서 dark mode까지 병행하면 CSS 부채가 두 배 늘어난다.
2. 서비스 초기 단계에서 dark mode는 유저에게 핵심 가치가 아니다.
3. 단, CSS 변수 구조는 dark mode를 나중에 추가할 수 있도록 `@media (prefers-color-scheme: dark) { :root { ... } }` 블록을 주석으로 예약해 둔다.

### ORNEO CI 이미지에서 반영할 시각적 원칙

CI 이미지(`/orneo/.claude/금융·자기계발 융합 웹앱 CI 로고.png`)에서 관찰한 시각적 원칙:

- **그라디언트 방향성**: Primary 블루(`#2563EB`) → Deep 네이비(`#0C2AA8`)로 좌→우 또는 좌상→우하. 수직 그라디언트는 브랜드 톤에 맞지 않음.
- **포인트 컬러의 사용 절제**: `#00C2A8`(청록)은 강조·완료·포인트에만 사용. 배경으로 쓰면 과해짐. 비율 기준: 화면 전체의 5~10% 이내.
- **여백과 정렬**: CI 로고가 충분한 여백과 중심 정렬을 사용. UI에서도 콘텐츠 밀도를 낮게 유지.
- **서체 굵기 대비**: ORNEO 로고 자체가 Bold+Gradient로 강렬한 첫인상. UI의 제목들도 `font-bold` 이상을 유지해 브랜드 연속성을 지킨다.

---

## 4. 공통 컴포넌트 리팩토링 계획

### Button

**유지할 API**

```typescript
variant?: "primary" | "outline" | "ghost"  // 기존 유지
loading?: boolean                           // 기존 유지
disabled?: boolean                          // 기존 유지 (HTMLButtonAttributes 상속)
className?: string                          // 기존 유지
children: React.ReactNode                   // 기존 유지
```

**추가할 variant / size / state**

```typescript
variant?: "primary" | "outline" | "ghost" | "danger" | "point"
// danger: 삭제·경고 액션 (빨간 계열)
// point: 완료·달성 강조 (#00C2A8 계열)

size?: "sm" | "md" | "lg" | "icon"
// sm:   px-3 py-2 text-xs     (최소 터치 타깃 44px 확인 필요)
// md:   px-4 py-3 text-sm     (현재 기본값, 유지)
// lg:   px-6 py-4 text-base   (풀 너비 CTA용)
// icon: h-10 w-10 p-0         (아이콘 전용, 정사각형)

fullWidth?: boolean  // w-full 추가 여부
```

**접근성 개선**

```tsx
// 추가 항목
<button
  aria-busy={loading}
  aria-disabled={disabled || loading}
  className={[
    ...,
    "focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
  ].join(" ")}
>
```

**모바일 터치 UX**

- `min-h-[44px]` 보장 (size sm 제외 시 44px는 py-3으로 충족)
- `active:scale-[0.97]` transition 추가로 눌림 피드백
- `touch-manipulation` 클래스 추가 (더블탭 줌 방지)

**사용 예시**

```tsx
<Button variant="primary" size="lg" fullWidth>시작하기</Button>
<Button variant="outline" size="md">취소</Button>
<Button variant="danger" size="sm">삭제</Button>
<Button variant="ghost" size="icon" aria-label="메뉴 닫기">
  <XIcon />
</Button>
<Button loading>저장 중...</Button>
```

**리스크**

- `size="icon"`에서 `children`이 텍스트인 경우 레이아웃 깨짐. 사용 가이드라인 주석 필요.
- `danger` variant 색상이 브랜드 팔레트와 이질감이 있을 수 있음. 컬러 검토 필요.

---

### Card

**유지할 API**

```typescript
padded?: boolean   // 기존 유지 (기본값 true)
className?: string
children: React.ReactNode
```

**추가할 variant / props**

```typescript
variant?: "default" | "gradient" | "point" | "outlined"
// default:  흰 배경, shadow-card (기존과 동일)
// gradient: primary 그라디언트 배경, 흰 텍스트 (라이프 캐피털 점수 카드용)
// point:    point-light 배경, point 테두리 강조 (오늘의 핵심 질문용)
// outlined: 테두리만, shadow 없음 (빈 상태, 보조 정보용)

interactive?: boolean  // hover/active 스타일 + cursor-pointer
as?: React.ElementType // "article" | "section" | "li" | etc. (기본 "div")
padding?: "sm" | "md" | "lg"  // padded=true 대신 세분화
// sm: p-3, md: p-4 (기본), lg: p-6
```

**접근성 개선**

- `interactive=true`이고 `as="button"`일 경우 `focus-visible` ring 자동 적용.
- semantic markup 가이드 주석 추가.

**모바일 터치 UX**

- `interactive=true` 시 `active:scale-[0.99]` 추가.

**사용 예시**

```tsx
<Card variant="gradient" padding="lg">
  <h2 className="text-white font-bold">라이프 캐피털 점수</h2>
</Card>

<Card variant="point" padding="md">
  <p>오늘의 핵심 질문</p>
</Card>

<Card interactive as="article" onClick={...}>
  <JournalEntry />
</Card>
```

**리스크**

- `as` prop의 타입 정의가 복잡할 수 있음. `React.ElementType` + `ComponentPropsWithoutRef<T>` 패턴 사용 필요.
- `gradient` variant에서 자식 텍스트 색상이 흰색이어야 하므로 내부에서 텍스트를 직접 쓰는 소비 컴포넌트 수정 필요.

---

### Input

**유지할 API**

```typescript
label?: string    // 기존 유지
error?: string    // 기존 유지
id?: string       // 기존 유지
className?: string
// + HTMLInputAttributes 전부 spread
```

**추가할 props**

```typescript
helperText?: string          // 에러 아닌 안내 메시지
prefix?: React.ReactNode     // 좌측 아이콘/텍스트 (단위, 검색 아이콘 등)
suffix?: React.ReactNode     // 우측 아이콘/텍스트 ("원", 비밀번호 토글 등)
multiline?: boolean          // true면 <textarea>로 렌더링
rows?: number                // multiline일 때 기본 rows
success?: boolean            // 유효성 통과 시 녹색 테두리
```

**접근성 개선**

```tsx
// id 미전달 시 자동 생성
const inputId = id ?? useId();
// focus-visible 전환
"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
// aria-describedby로 error/helperText 연결
```

**모바일 터치 UX**

- `py-3` 유지 (44px 터치 타깃 확보)
- `type="number"`일 때 모바일 숫자 키패드: `inputMode="numeric"` 기본 적용 고려

**사용 예시**

```tsx
<Input
  label="월 저축 목표액"
  suffix={<span>원</span>}
  inputMode="numeric"
  helperText="세후 기준으로 입력해주세요"
/>

<Input
  label="의사결정 메모"
  multiline
  rows={4}
  placeholder="오늘 어떤 판단을 했나요?"
/>

<Input label="이메일" error="올바른 이메일 형식이 아닙니다" />
<Input label="비밀번호" success />
```

**리스크**

- `multiline` 분기 시 `<input>` vs `<textarea>` 타입 분기로 TypeScript 타입이 복잡해짐. Union type 또는 별도 `Textarea` 컴포넌트로 분리하는 것도 검토.

---

### Toast

**유지할 API**

```typescript
message: string         // 기존 유지
onDismiss: () => void   // 기존 유지
duration?: number       // 기존 유지 (기본 3500ms)
```

**추가할 props / 구조 변경**

```typescript
type ToastType = "default" | "success" | "error" | "warning" | "info"
type?: ToastType   // 기본 "default"
action?: { label: string; onClick: () => void }  // 인라인 액션 버튼
```

타입별 스타일:

| type | 배경 | 아이콘 |
|---|---|---|
| `default` | `--color-text` (기존) | 없음 |
| `success` | `--color-success` | ✓ 체크 |
| `error` | `--color-danger` | ✕ |
| `warning` | `--color-warning` | ⚠ |
| `info` | `--color-primary` | ℹ |

**접근성 개선**

```tsx
<div
  role={type === "error" ? "alert" : "status"}
  aria-live={type === "error" ? "assertive" : "polite"}
  aria-atomic="true"
>
```

**모바일 위치 수정**

```tsx
// 하단 nav 높이(64px) + safe-area + 여유 여백 계산
// 모바일: bottom-[calc(64px+env(safe-area-inset-bottom)+8px)]
// 데스크톱: bottom-6
className="fixed left-1/2 z-50 -translate-x-1/2
           bottom-[calc(64px+env(safe-area-inset-bottom)+8px)]
           sm:bottom-6"
```

**리스크**

- 토스트를 여러 개 동시에 쓰는 경우, 단일 컴포넌트로는 스택 관리 불가. 중기적으로 `useToast` hook + `ToastProvider` Context 패턴으로 전환 권장. **단, 이번 Phase에서는 단일 컴포넌트 개선에 집중하고 전환은 Phase 5 이후로 미룬다.**

---

## 5. 레이아웃 리팩토링 계획

### `src/app/layout.tsx` 수정 방향

```tsx
// 1. next/font/local로 Pretendard 로드
import localFont from "next/font/local";
const pretendard = localFont({
  src: "../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
});
// → <html className={`${pretendard.variable} h-full antialiased`}>
// → globals.css의 font-family를 var(--font-pretendard)로 변경

// 2. viewport meta 추가
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",          // iOS safe area
  themeColor: "#2563EB",         // 브라우저 상단바 색상
};
```

**주의**: Pretendard 폰트 파일을 `public/fonts/`에 추가해야 한다. woff2 subset 버전 사용 권장 (파일 크기 최적화). 폰트 파일이 없으면 시스템 폰트 폴백이 적용된다.

### `src/app/(app)/layout.tsx` 수정 방향

**모바일/데스크톱 네비게이션 구조**

```
모바일(< 640px):
  - 사이드바 없음
  - 상단 헤더: 로고 + 페이지 제목 + 설정 아이콘
  - 하단 고정 탭 네비게이션 4개 (대시보드, 일지, 목표, 리포트)

데스크톱(≥ 640px):
  - 좌측 사이드바 (w-60, 고정)
  - 상단 헤더 없음 (사이드바에 로고 포함)
  - 하단 탭 없음
```

**NAV_ITEMS 구조 개선**

```typescript
const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", shortLabel: "홈",   icon: <DashboardIcon /> },
  { href: "/journal",   label: "의사결정 일지", shortLabel: "일지", icon: <JournalIcon />   },
  { href: "/goals",     label: "목표 관리",  shortLabel: "목표",  icon: <GoalsIcon />    },
  { href: "/reports",   label: "주간 리포트", shortLabel: "리포트", icon: <ReportIcon />   },
];
// shortLabel을 하단 nav에서 사용 (replace 패턴 제거)
```

**모바일 Safe Area 처리**

```tsx
{/* 하단 nav */}
<nav className="fixed bottom-0 left-0 right-0 z-40
                pb-[env(safe-area-inset-bottom)]
                border-t border-[var(--color-border)]
                bg-[var(--color-card)] sm:hidden">
  {/* 탭 항목 */}
</nav>

{/* 메인 콘텐츠 — 하단 nav + safe area 높이만큼 padding 확보 */}
<main className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] sm:pb-0">
```

**활성 탭 인디케이터**

```tsx
// 하단 nav 활성 탭 상단에 2px 라인 표시
isActive(href) ? "border-t-2 border-[var(--color-primary)] text-[var(--color-primary)]" : ""
```

**PageContainer 신설**

```tsx
// src/components/ui/PageContainer.tsx
export function PageContainer({ children, size = "md" }: { children: React.ReactNode; size?: "sm" | "md" | "lg" }) {
  const maxW = { sm: "max-w-xl", md: "max-w-2xl", lg: "max-w-3xl" }[size];
  return (
    <div className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${maxW}`}>
      {children}
    </div>
  );
}
// 기존 각 페이지의 "mx-auto max-w-3xl" + "p-4 sm:p-8" 패턴을 이 컴포넌트로 통합
```

**기존 라우팅에 미치는 영향**

- 라우팅 구조(`/dashboard`, `/journal`, `/goals`, `/reports`) 변경 없음.
- 모바일 헤더를 추가할 경우, 각 페이지의 `<h1>` 제목과 헤더 제목이 중복될 수 있다. 페이지 제목을 동적으로 헤더에 표시하는 경우 Context나 `usePathname` 기반 매핑을 사용.

**설정 페이지 신설 필요**

- `/settings` 페이지와 NAV_ITEMS에 설정 항목 추가 (또는 사이드바 하단 아이콘).
- 현재 모바일에서 로그아웃 방법이 없음. 설정 페이지가 만들어지기 전까지 임시로 하단 nav에 설정 아이콘 + 드롭다운 또는 모달로 처리.

---

## 6. 대시보드 정보 구조 재설계

### 현재 구조의 문제

현재 대시보드 순서: **점수 게이지 → 점수 상세 → 핵심 질문 → 오늘의 행동**

모바일에서 375px 기준으로 볼 때:
- 점수 게이지 카드가 가장 크고 시각적으로 지배적이다.
- "오늘 할 행동"은 두 번째~세 번째 스크롤 이후에야 보인다.
- 서비스의 핵심 가치인 **"오늘 무엇을 해야 하는가"**가 첫 화면에서 보이지 않는다.

### 제안하는 재설계 순서

**모바일 첫 화면에서 보여야 하는 정보 (스크롤 없이):**

```
┌────────────────────────────────┐
│  [헤더] 안녕하세요, OOO님   설정 │
│  오늘 OO월 OO일 (요일)         │
├────────────────────────────────┤
│  [카드 1] 오늘 할 행동          │
│   ☐ 실거래가 변화 확인          │
│   ☐ 투자 가설 일지 작성         │
│   ☐ K-MOOC 20분 학습           │
├────────────────────────────────┤
│  [카드 2] 오늘의 핵심 질문      │
│   💡 지금 매수보다 현금 확보가  │
│      더 나은 선택일까요?        │
└────────────────────────────────┘
```

**스크롤 후 보이는 정보:**

```
┌────────────────────────────────┐
│  [카드 3] 라이프 캐피털 점수    │
│  [Gauge] 78점                  │
│  자산안정성 82 / 목표진행 71 /  │
│  루틴 점수 65                   │
├────────────────────────────────┤
│  [카드 4] 빠른 진입              │
│  [의사결정 일지 →]  [주간 리포트→]│
├────────────────────────────────┤
│  [카드 5] AI 요약 (선택적)      │
│  (데이터가 있는 경우만 노출)    │
└────────────────────────────────┘
```

**데스크톱에서 확장되는 정보:**

```
┌──────────┬─────────────────────────────────┐
│ 사이드바  │  [헤더] 대시보드                │
│           │                                 │
│           │  [좌 컬럼]      [우 컬럼]       │
│           │  라이프 캐피털   오늘 할 행동    │
│           │  점수 카드      핵심 질문        │
│           │                 빠른 진입 버튼   │
│           │  점수 상세                       │
│           │  AI 요약                         │
└──────────┴─────────────────────────────────┘
```

### 카드 배치 전략

- **모바일**: `flex flex-col gap-3` 단일 컬럼
- **데스크톱(sm 이상)**: `grid grid-cols-[1fr_360px] gap-6` (좌: 점수/AI, 우: 행동/질문/진입)

### Empty State (신규 사용자 — 데이터 없음)

```tsx
// 오늘 할 행동이 없을 때
<Card variant="outlined">
  <p className="text-sm text-[var(--color-text-sub)]">
    오늘의 행동을 아직 설정하지 않았어요.
  </p>
  <Button variant="point" size="sm" className="mt-3">
    목표에서 행동 추가하기 →
  </Button>
</Card>
```

### Loading State

현재: 텍스트 "불러오는 중..."

개선: 카드 형태 skeleton UI

```tsx
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* 행동 카드 skeleton */}
      <div className="h-40 rounded-xl bg-[var(--color-border)]" />
      {/* 핵심 질문 skeleton */}
      <div className="h-24 rounded-xl bg-[var(--color-border)]" />
      {/* 점수 카드 skeleton */}
      <div className="h-48 rounded-xl bg-[var(--color-border)]" />
    </div>
  );
}
```

### Error State

```tsx
<Card variant="outlined">
  <p className="text-sm text-[var(--color-danger)]">대시보드를 불러오지 못했습니다.</p>
  <Button variant="outline" size="sm" onClick={retry} className="mt-3">
    다시 시도
  </Button>
</Card>
```

현재는 에러 시 MOCK 데이터를 보여주는 방식 (`.catch(() => setData(MOCK))`). 사용자가 실제 에러인지 모름. **에러와 fallback을 명확히 분리**한다.

### 신규 사용자 상태 vs 활성 사용자 상태

| 조건 | 처리 |
|---|---|
| `today_actions.length === 0` | Empty state + 목표 설정 CTA |
| `key_question === null or ""` | 핵심 질문 카드 숨김 또는 "아직 AI가 질문을 생성 중입니다" |
| `score === 0 or null` | 점수 카드에 "데이터를 더 입력하면 점수가 계산됩니다" |
| 모든 데이터 있음 | 정상 표시 |

---

## 7. 화면별 개선 우선순위

### 대시보드 (`/dashboard`)

- **현재 문제**: 모바일에서 핵심 행동이 스크롤 이후 노출. 에러 처리가 MOCK으로 덮어씌워짐. Loading이 텍스트 only.
- **개선 방향**: Section 6의 정보 구조 재설계 적용. Skeleton 로딩. 에러/empty state 분리.
- **공통 컴포넌트 의존성**: `Card(variant)`, `Button(size)`, `PageContainer`, `Toast`
- **예상 난이도**: 중 (구조 변경 + 그리드 레이아웃 추가)
- **우선순위**: **P0**

---

### 온보딩 (`/onboarding`)

- **현재 문제**: 전체적으로 완성도 높음. 단, `prefix`/`suffix`가 Input 컴포넌트 미지원으로 직접 구현. 브레이크포인트 이슈 없음 (풀스크린 독립 레이아웃).
- **개선 방향**: Input 컴포넌트 `suffix` 지원 후 온보딩 Step1의 "원" suffix를 컴포넌트로 교체. Progress bar는 현재 충분히 기능적.
- **공통 컴포넌트 의존성**: `Input(suffix)`, `Button(size)`, `Card`
- **예상 난이도**: 하 (컴포넌트 교체 수준)
- **우선순위**: **P2** (기능상 문제 없어 후순위)

---

### 의사결정 일지 (`/journal`)

- **현재 문제**: Empty state 있음. 카테고리 탭이 인라인 버튼이고 공통 Tab 컴포넌트가 아님. AI 요약 폴링 중 UX 표시 없음.
- **개선 방향**: `CategoryTabs` 패턴을 공통 `Tabs` 컴포넌트로 추상화(중기). AI 요약 생성 중 카드에 spinner 표시. `JournalCard`에 interactive Card 적용.
- **공통 컴포넌트 의존성**: `Card(interactive)`, `Button`, `Toast(type=success)`
- **예상 난이도**: 중
- **우선순위**: **P1**

---

### 목표 관리 (`/goals`)

- **현재 문제**: 카테고리 탭이 인라인 `button` 직접 구현 (Journal과 동일 패턴 중복). FAB이 `Button` 컴포넌트를 사용하지 않고 직접 구현.
- **개선 방향**: FAB을 `Button(variant="primary", size="icon")`으로 교체. 카테고리 탭 공통화.
- **공통 컴포넌트 의존성**: `Button(icon, size)`, `Card`
- **예상 난이도**: 하~중
- **우선순위**: **P1**

---

### 주간 리포트 (`/reports`)

- **현재 문제**: Empty state는 있으나 카드가 아닌 `div`에 직접 스타일. 에러 처리는 `div`에 직접 빨간 배경.
- **개선 방향**: Empty/Error state를 공통 패턴으로 교체. `Card(variant="outlined")`로 empty state 통일.
- **공통 컴포넌트 의존성**: `Card(outlined)`, `Button`
- **예상 난이도**: 하
- **우선순위**: **P2**

---

### 로그인 (`/login`)

- **현재 문제**: 완성도 양호. Google 버튼이 공통 Button 컴포넌트가 아닌 `<a>` 태그 직접 구현.
- **개선 방향**: 소셜 로그인 버튼 스타일을 `Button(variant="outline")`으로 통합하거나 별도 `SocialButton` 컴포넌트 신설.
- **예상 난이도**: 하
- **우선순위**: **P2**

---

### 설정/프로필 (미존재)

- **현재 문제**: 페이지 파일 없음. 모바일에서 로그아웃 방법 없음.
- **개선 방향**: `/settings` 페이지 신설 (프로필, 로그아웃, 온보딩 정보 수정 진입). Phase 3에서 레이아웃 정리와 함께 stub 페이지 먼저 생성.
- **공통 컴포넌트 의존성**: `Card`, `Button(danger)`, `PageContainer`
- **예상 난이도**: 하 (stub 기준)
- **우선순위**: **P1** (모바일 로그아웃 문제 해결 필요)

---

## 8. 단계별 실행 계획

### Phase 0: 백업 및 현황 파악

**수정 파일**: 없음 (읽기 전용)

**작업 내용**

1. `git checkout -b feature/ui-refactor` 브랜치 생성
2. 현재 주요 화면을 375px / 1280px 너비로 스크린샷 촬영하여 `prompts/screenshots/before/` 에 저장
3. `npm run build`로 현재 빌드 통과 여부 확인
4. `npx tsc --noEmit`으로 타입 오류 현황 파악 (확인 필요: package.json에 `lint`, `typecheck` 스크립트 없음)

**완료 기준**: 브랜치 생성 완료, before 스크린샷 존재, 빌드 통과 확인

**리스크**: 현재 빌드가 이미 오류 상태일 수 있음

**롤백**: Phase 0은 변경 없으므로 롤백 불필요

---

### Phase 1: 디자인 토큰 및 globals.css 정리

**수정 파일**

- `src/app/globals.css`
- `src/app/layout.tsx`
- `public/fonts/` (Pretendard 폰트 파일 추가)

**작업 내용**

1. Section 3의 신규 CSS 변수를 `:root`에 추가 (기존 변수 이름 변경 금지)
2. `@theme inline` 블록에 신규 토큰 매핑 추가
3. Pretendard Variable woff2 파일을 `public/fonts/`에 추가
4. `layout.tsx`에 `next/font/local` 설정 추가
5. `viewport` export 추가 (`viewportFit: "cover"`, `themeColor: "#2563EB"`)
6. dark mode 블록 주석으로 예약

**완료 기준**

- `npm run build` 통과
- 브라우저에서 Pretendard 폰트 적용 확인 (DevTools Network 탭)
- `var(--color-primary-light)`, `var(--shadow-card)` 등 신규 토큰이 CSS에 존재 확인

**리스크**: 폰트 파일 누락 시 빌드는 통과하나 폰트 미적용

**롤백**: `git revert` 또는 branch 삭제

---

### Phase 2: 공통 UI 컴포넌트 리팩토링

**수정 파일**

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/PageContainer.tsx` (신규 생성)

**작업 내용**

각 컴포넌트별 Section 4의 계획 적용. 순서: Card → Button → Input → Toast → PageContainer.

**완료 기준**

- 기존 사용처 (`dashboard/page.tsx`, `journal/page.tsx`, `goals/page.tsx` 등) 에서 빌드 에러 없음
- `Button`: 5가지 variant, 4가지 size, `aria-busy`, `focus-visible` 동작 확인
- `Card`: 4가지 variant, `interactive` 동작, `as` prop 확인
- `Input`: `prefix`, `suffix`, `helperText`, `multiline` 동작 확인
- `Toast`: 5가지 type, ARIA role, 모바일 위치(하단 nav 위) 확인
- `PageContainer`: `max-w-*` 3단계 + px 확인

**리스크**

- Card `as` prop 타입 구현 복잡도. 어려울 경우 `as` prop을 생략하고 `className`으로 해결
- Input `multiline`이 복잡하면 별도 `Textarea.tsx`로 분리

**롤백**: 각 컴포넌트 파일을 git 이전 커밋으로 복원

---

### Phase 3: 레이아웃/네비게이션 정리

**수정 파일**

- `src/app/(app)/layout.tsx`
- `src/app/(app)/settings/page.tsx` (신규 — stub)
- 각 `(app)` 하위 `page.tsx`에서 `mx-auto max-w-*` → `<PageContainer>` 교체

**작업 내용**

1. NAV_ITEMS에 `shortLabel` 추가, 하단 nav `replace` 패턴 제거
2. Safe area padding 적용
3. 하단 nav 활성 탭 인디케이터 상단 라인 추가
4. 모바일 헤더 추가 (로고 + 설정 아이콘)
5. `/settings` stub 페이지 생성 (로그아웃 버튼 포함)
6. 사이드바 하단 설정 링크 추가
7. 각 page.tsx에서 `mx-auto max-w-*` 제거, `<PageContainer>`로 교체

**완료 기준**

- 375px 에뮬레이터에서 하단 nav 표시 확인, safe area 적용 확인
- 모바일에서 로그아웃 가능 확인 (/settings 접근)
- 사이드바와 하단 nav 사이 640px 미만 구간에서 레이아웃 공백 없음
- 기존 라우팅 전부 정상 동작

**리스크**: 모바일 헤더 추가 시 콘텐츠 상단 여백이 기존 페이지와 충돌 가능

**롤백**: layout.tsx git revert

---

### Phase 4: 대시보드 재구성

**수정 파일**

- `src/app/(app)/dashboard/page.tsx`
- `src/components/dashboard/CapitalScoreGauge.tsx`
- `src/components/dashboard/ScoreBreakdown.tsx`
- `src/components/dashboard/KeyQuestion.tsx`
- `src/components/dashboard/TodayActions.tsx`
- `src/components/dashboard/DashboardSkeleton.tsx` (신규)

**작업 내용**

1. 정보 순서 변경: TodayActions → KeyQuestion → CapitalScoreGauge+ScoreBreakdown → 빠른 진입 카드
2. 데스크톱 2컬럼 그리드 적용 (`sm:grid sm:grid-cols-[1fr_360px]`)
3. DashboardSkeleton 컴포넌트 신설, loading 시 적용
4. 에러 state와 MOCK fallback 분리: `isError` state 추가
5. Empty state 처리 (오늘 할 행동 없음, 점수 없음)
6. 빠른 진입 카드 추가 (/journal, /reports 링크)
7. `Card(variant)` 활용하여 각 카드 시각적 구분

**완료 기준**

- 375px에서 스크롤 없이 TodayActions 카드 전체 노출
- Skeleton 로딩 확인
- 에러 시 Toast(type="error") 표시
- Empty state에서 CTA 버튼 동작 확인
- 데스크톱에서 2컬럼 그리드 표시 확인

**리스크**: CapitalScoreGauge 컴포넌트가 크기 고정이면 2컬럼에서 깨질 수 있음

**롤백**: dashboard/page.tsx git revert

---

### Phase 5: 주요 화면 적용

**수정 파일**

- `src/app/(app)/journal/page.tsx`, `src/components/journal/*.tsx`
- `src/app/(app)/goals/page.tsx`, `src/components/goals/*.tsx`
- `src/app/(app)/reports/page.tsx`, `src/components/reports/*.tsx`
- `src/app/(auth)/login/page.tsx`

**작업 내용**

1. 각 화면에서 인라인 스타일 override → 공통 컴포넌트 교체
2. Journal: `JournalCard`를 `Card(interactive)` 기반으로 교체, AI 요약 폴링 UX 개선
3. Goals: FAB을 `Button(icon)`, 카테고리 탭 스타일 개선
4. Reports: Empty/Error state를 `Card(outlined)` + 공통 패턴으로 교체
5. Login: Google 버튼 스타일 정리

**완료 기준**

- 각 화면 빌드 통과
- 공통 컴포넌트가 아닌 인라인 hover/active 스타일이 없어짐

**리스크**: 화면 수가 많아 회귀 테스트 범위 넓음

---

### Phase 6: 접근성 / 반응형 / 회귀 테스트

**수정 파일**: 검수 후 발견된 파일만 수정

**작업 내용**

1. Section 9의 검증 체크리스트 전체 실행
2. 명도 대비 확인 (WCAG AA: 일반 텍스트 4.5:1, 대형 텍스트 3:1)
3. 키보드 내비게이션 전체 화면 확인 (Tab → Enter → Escape)
4. iOS Safari에서 safe area 확인
5. `npm run build` 최종 확인
6. `npx tsc --noEmit` 타입 오류 0개 확인

**완료 기준**: 체크리스트 전 항목 통과

---

## 9. 검증 체크리스트

### 375px 모바일 확인

- [ ] 대시보드: 스크롤 없이 TodayActions 카드 보임
- [ ] 대시보드: 하단 nav가 콘텐츠를 가리지 않음
- [ ] 하단 nav safe area padding 적용 (iOS)
- [ ] 모바일 헤더 로고 + 설정 아이콘 표시
- [ ] 터치 타깃 44px 이상 (Button, nav 탭, Input)
- [ ] 가로 스크롤 없음

### 데스크톱 확인

- [ ] 사이드바 표시 (640px 이상)
- [ ] 대시보드 2컬럼 그리드 표시
- [ ] 하단 nav 숨김
- [ ] 콘텐츠 최대 너비 제한 적용

### Light Mode 색상 대비

- [ ] 본문 텍스트(`#0B132B`) on 배경(`#F1F5F9`): 대비비 확인
- [ ] 서브 텍스트(`#334155`) on 흰 카드(`#FFFFFF`): 대비비 확인
- [ ] primary 버튼(흰 텍스트 on `#2563EB`): WCAG AA 통과 확인
- [ ] point 버튼(흰 텍스트 on `#00C2A8`): **확인 필요** (청록 배경의 흰 텍스트 대비 부족 가능성 있음)

### 버튼/인풋/토스트 상태 확인

- [ ] Button: primary / outline / ghost / danger / point 각 variant 표시
- [ ] Button: loading 상태 (spinner + aria-busy)
- [ ] Button: disabled 상태 (opacity + cursor-not-allowed)
- [ ] Button: focus-visible ring 키보드 포커스 시 표시
- [ ] Input: label, error, helperText, prefix, suffix 표시
- [ ] Input: focus-visible ring (마우스 클릭 시 미표시, 키보드 Tab 시 표시)
- [ ] Toast: success / error / warning / info 각 type 색상
- [ ] Toast: 모바일에서 하단 nav 위에 표시

### 네비게이션 확인

- [ ] 모바일 하단 nav 4개 탭 전환
- [ ] 활성 탭 인디케이터 표시
- [ ] 사이드바 활성 항목 하이라이트
- [ ] /settings 접근 및 로그아웃 동작

### 대시보드 empty/loading/error 확인

- [ ] loading: Skeleton UI 표시
- [ ] error: 에러 메시지 + 재시도 버튼 (MOCK 대체 아님)
- [ ] empty(actions 없음): CTA 버튼 표시
- [ ] 정상: 전체 대시보드 표시

### 기존 기능 회귀 확인

- [ ] 로그인 → 온보딩 → 대시보드 플로우
- [ ] 의사결정 일지 작성 → 목록 표시 → 복기 저장
- [ ] 목표 생성 모달 → 목록 표시
- [ ] 주간 리포트 생성 → 표시

### 빌드 / 타입 체크

> **확인 필요**: `package.json`에 `lint` 및 `typecheck` 스크립트가 없음.
> `devDependencies`에 ESLint 관련 패키지도 없음. 프로젝트에 ESLint 설정 여부 확인 후 추가 고려.

```bash
# 패키지 매니저: npm (package.json 기준)

# 빌드
npm run build

# 타입 체크 (scripts에 없으므로 직접 실행)
npx tsc --noEmit

# 린트 (ESLint 설정이 있는 경우만)
# 현재 package.json에 eslint 의존성 없음 — 확인 필요
# npx eslint src/

# 개발 서버
npm run dev
```

---

## 10. 구현 시 Claude Code에게 줄 후속 프롬프트

아래 프롬프트를 Phase별로 구현 시 Claude Code에 붙여넣어 사용하라.

---

### Phase 1 프롬프트 (디자인 토큰)

```
프로젝트 경로: /Users/2nan/Documents/private/orneo/frontend

아래 작업을 순서대로 진행해줘.

1. Pretendard Variable 폰트 woff2 파일을 public/fonts/ 폴더에 추가하는 방법을 안내해줘.
   (파일이 없으면 https://github.com/orioncactus/pretendard 에서 다운로드 필요)

2. src/app/globals.css에 아래 CSS 변수와 @theme 토큰을 추가해줘.
   - 신규 색상: --color-primary-light, --color-point-light, --color-danger, --color-danger-light, --color-success, --color-warning
   - 그림자 토큰: --shadow-card, --shadow-modal, --shadow-fab
   - radius 토큰: --radius-sm(8px), --radius-md(12px), --radius-lg(16px), --radius-xl(20px), --radius-full(9999px)
   - 기존 변수명 변경 금지. 신규 토큰만 추가.

3. src/app/layout.tsx에 next/font/local로 Pretendard 로드 추가,
   viewport export 추가 (viewportFit: "cover", themeColor: "#2563EB").

4. 수정 후 npx tsc --noEmit 결과 확인.
```

---

### Phase 2 프롬프트 (공통 컴포넌트)

```
프로젝트 경로: /Users/2nan/Documents/private/orneo/frontend
리팩토링 계획: prompts/2026-04-25-ui-dashboard-refactor-plan.md Section 4 참고

아래 파일들을 순서대로 리팩토링해줘.

1. src/components/ui/Card.tsx
   - variant: "default" | "gradient" | "point" | "outlined" 추가
   - padding: "sm"(p-3) | "md"(p-4) | "lg"(p-6) 추가 (padded prop은 하위 호환 유지)
   - interactive, as prop 추가
   - 기존 API(padded, className, children) 유지

2. src/components/ui/Button.tsx
   - variant에 "danger", "point" 추가
   - size: "sm" | "md" | "lg" | "icon" 추가 (기본 "md")
   - fullWidth prop 추가
   - aria-busy, focus-visible:ring-2, touch-manipulation 추가

3. src/components/ui/Input.tsx
   - prefix, suffix (React.ReactNode) 추가
   - helperText 추가
   - multiline + rows 추가 (<textarea> 분기)
   - id 자동 생성 (useId 활용)
   - focus → focus-visible 변경

4. src/components/ui/Toast.tsx
   - type: "default" | "success" | "error" | "warning" | "info" 추가
   - role="status" / "alert" 추가
   - 모바일 bottom 위치를 하단 nav 위로 조정
     (bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] sm:bottom-6)

5. src/components/ui/PageContainer.tsx 신규 생성
   - size: "sm"(max-w-xl) | "md"(max-w-2xl) | "lg"(max-w-3xl) props
   - mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 기본 적용

수정 후 npx tsc --noEmit으로 타입 에러 없음 확인.
기존 사용처 (dashboard, journal, goals, reports page.tsx) 빌드 에러 없음 확인.
```

---

### Phase 3 프롬프트 (레이아웃)

```
프로젝트 경로: /Users/2nan/Documents/private/orneo/frontend
리팩토링 계획: prompts/2026-04-25-ui-dashboard-refactor-plan.md Section 5 참고

아래 작업을 진행해줘.

1. src/app/(app)/layout.tsx 수정:
   - NAV_ITEMS에 shortLabel 필드 추가 (대시보드→홈, 의사결정 일지→일지, 목표 관리→목표, 주간 리포트→리포트)
   - 하단 nav label에 replace 패턴 제거, shortLabel 사용
   - 하단 nav에 safe area padding 추가: pb-[env(safe-area-inset-bottom)]
   - 메인 콘텐츠에 pb-[calc(64px+env(safe-area-inset-bottom))] sm:pb-0 추가
   - 하단 nav 활성 탭에 상단 border-t-2 border-primary 인디케이터 추가
   - 모바일 헤더 추가 (sm:hidden): 좌측 ORNEO 로고, 우측 설정 아이콘(/settings 링크)
   - 사이드바 하단에 설정 링크 추가

2. src/app/(app)/settings/page.tsx 신규 생성 (stub):
   - 프로필 섹션 (placeholder)
   - 로그아웃 버튼 (handleLogout 함수 포함)
   - PageContainer 사용

3. 각 (app) 하위 page.tsx에서 "mx-auto max-w-3xl" 또는 "mx-auto max-w-2xl" 패턴을
   PageContainer size 적용으로 교체:
   - dashboard: PageContainer size="lg"
   - journal: PageContainer size="md"
   - goals: PageContainer size="md"
   - reports: PageContainer size="lg"

수정 후 npm run build, npx tsc --noEmit 확인.
```

---

### Phase 4 프롬프트 (대시보드 재구성)

```
프로젝트 경로: /Users/2nan/Documents/private/orneo/frontend
리팩토링 계획: prompts/2026-04-25-ui-dashboard-refactor-plan.md Section 6 참고
프로토타입 참고 요소: 라이프 캐피털 점수 카드, 오늘의 핵심 질문 카드, 오늘 할 행동 리스트, 빠른 진입 카드

아래 작업을 진행해줘.

1. src/components/dashboard/DashboardSkeleton.tsx 신규 생성:
   - animate-pulse로 카드 형태 3개 skeleton

2. src/app/(app)/dashboard/page.tsx 수정:
   - 정보 순서 변경: TodayActions → KeyQuestion → CapitalScoreGauge/ScoreBreakdown → 빠른 진입 카드
   - loading 시 DashboardSkeleton 렌더링 (기존 텍스트 제거)
   - isError state 분리: catch에서 MOCK 대신 setIsError(true)
   - error state: Card(variant="outlined") + 에러 메시지 + 재시도 버튼
   - empty state: today_actions.length === 0 시 Empty state 카드 + /goals 링크 버튼
   - 빠른 진입 카드 추가: /journal, /reports 링크
   - 데스크톱 그리드: sm:grid sm:grid-cols-[1fr_360px] gap-6
     - 좌: CapitalScoreGauge + ScoreBreakdown + 빠른 진입
     - 우: TodayActions + KeyQuestion

3. Card variant 활용:
   - TodayActions 카드: variant="default"
   - KeyQuestion 카드: variant="point"
   - CapitalScore 카드: variant="gradient" (흰 텍스트 주의)

수정 후 375px 에뮬레이터에서 스크롤 없이 TodayActions 카드가 보이는지 확인.
npm run build, npx tsc --noEmit 확인.
```

---

*계획서 끝. 구현 전 이 파일을 다시 읽고 현재 Phase가 어디인지 확인 후 진행할 것.*
