# Session 07: Next.js 15 프로젝트 초기화 & 인증 화면

> **세션 목표**: 프론트엔드 기반을 잡고 인증 플로우를 완성한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 설정 + 인증 화면 2개
> **브랜치**: `feat/프론트엔드-인증` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/project_conventions.md
```

## 브랜드 컬러 (Tailwind CSS v4 CSS 변수로 정의)

```css
:root {
  --color-primary: #2563EB;
  --color-primary-end: #0C2AA8;
  --color-point: #00C2A8;
  --color-text: #0B132B;
  --color-text-sub: #334155;
  --color-border: #E2E8F0;
  --color-bg: #F1F5F9;
  --color-card: #FFFFFF;
}
```

---

## 꼭지 1: Next.js 15 프로젝트 초기화

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 루트 레이아웃 (폰트, 전역 스타일)
│   │   ├── page.tsx            # / → /dashboard 리다이렉트
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx      # 사이드바 + 헤더 공통 레이아웃
│   │       ├── dashboard/page.tsx
│   │       ├── journal/page.tsx
│   │       ├── journal/new/page.tsx
│   │       └── reports/page.tsx
│   ├── components/
│   │   └── ui/                 # Button, Input, Card 등 기본 컴포넌트
│   └── lib/
│       ├── api.ts              # fetch wrapper (BASE_URL, Authorization 헤더)
│       └── auth.ts             # JWT 토큰 관리 (cookie 기반)
├── public/
├── next.config.ts
├── tailwind.config.ts
├── Dockerfile
└── .dockerignore
```

`docker-compose.yml`에 frontend 서비스 추가.

**완료 기준**
- [ ] `http://localhost:3000` 접속 확인
- [ ] Hot reload 동작 확인

**커밋**
```
feat(frontend): Next.js 15 프로젝트 초기화 및 라우팅 구조 설정
```

---

## 꼭지 2: 로그인 & 회원가입 화면

**디자인 원칙**
- 배경: `var(--color-bg)` (#F1F5F9)
- 카드: `var(--color-card)`, rounded-2xl, shadow-sm
- Primary 버튼: `#2563EB → #0C2AA8` 그라디언트
- ORNEO 로고 + "오늘의 선택으로, 더 나은 나를." 슬로건 표시

**인증 방식**: JWT → httpOnly 쿠키 (Next.js Route Handler 사용)

```
POST /api/auth/login  (Next.js Route Handler)
  → Django /api/v1/auth/login/ 호출
  → access token을 httpOnly 쿠키에 저장
```

미인증 접근 시 `/login` 리다이렉트 (middleware.ts 사용).

**완료 기준**
- [ ] 회원가입 → 로그인 → `/dashboard` 진입 플로우 확인
- [ ] 새로고침 후에도 로그인 상태 유지 확인
- [ ] 미인증 상태에서 `/dashboard` 접근 → `/login` 리다이렉트 확인

**커밋**
```
feat(frontend): 로그인·회원가입 화면 및 JWT 인증 플로우 구현
```

---

## 세션 완료 후

```bash
git push origin feat/프론트엔드-인증
# PR: feat/프론트엔드-인증 → dev
# PR 제목: [feat] Next.js 프론트엔드 초기화 & 인증 화면
mv prompts/session_07_frontend_auth.md prompts/_complete/
```
