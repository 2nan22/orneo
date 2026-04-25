# ORNEO UI Refactor — Known Issues

> 마지막 업데이트: 2026-04-25

## 접근성

- [ ] GoalCreateModal, ReviewModal 포커스 트랩 미구현 (다음 이터레이션)
  - 현재: 모달 열림 시 Tab 키가 모달 외부 요소로 빠져나갈 수 있음
  - 권장 해결: `focus-trap-react` 라이브러리 또는 수동 `keydown` 핸들러

## 기능

- [ ] 설정 페이지 프로필 편집 미구현 (stub 상태)
  - 현재: `/settings`는 로그아웃 버튼만 존재, 프로필 표시·수정 없음
- [ ] Textarea 공통 컴포넌트 미구현
  - 현재: `Input.tsx`의 `multiline` prop으로 처리 중 — TypeScript 타입 복잡도로 분리 검토 필요

## 스타일

- [ ] Dark mode 미구현
  - `globals.css`에 `@media (prefers-color-scheme: dark)` 블록 주석으로 예약됨
- [ ] GoalCard 카테고리 배지가 Tailwind 하드코딩 색상 사용 (`bg-blue-100 text-blue-700` 등)
  - 디자인 토큰 변수로 교체 권장
- [ ] 토스트 스택 관리 미구현
  - 현재 단일 Toast 컴포넌트 — 동시 다중 표시 불가
  - 중기 개선: `useToast` hook + `ToastProvider` Context 패턴

## 테스트

- [ ] E2E 자동화 테스트 미구현 (Playwright/Cypress)
  - 현재 수동 회귀 테스트로 검증
- [ ] 접근성 자동화 테스트 미구현 (axe-core 등)
