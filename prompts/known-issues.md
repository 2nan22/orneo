# ORNEO — Known Issues (Session 28 기준)

> 마지막 업데이트: 2026-04-27

## 구현됨 (Session 25~28에서 완료)

- [x] Studio 실 기능 (일지 + 시나리오 연동)
- [x] Finance 실 데이터 (일지 + DART 검색)
- [x] MeasureMode 전역 Context
- [x] HeroScoreCard AI 요약 + 실 delta
- [x] AI 모델 설정 저장 (구조 마련)
- [x] 알림 토글 설정 저장

## 다음 이터레이션 예정

- [ ] Qwen/서버 고성능 모델 실제 연동 (현재 Gemma만 활성)
- [ ] 실제 푸시 알림 (Web Push / Email)
- [ ] Finance 화면 MOLIT 실거래가 이벤트 카드 (현재 DART만)
- [ ] Studio 화면 직접 주제 입력 → 일지 없이 시나리오 생성
- [ ] GoalCreateModal 포커스 트랩
- [ ] Dark mode

## 접근성

- [ ] GoalCreateModal, ReviewModal 포커스 트랩 미구현 (다음 이터레이션)
  - 현재: 모달 열림 시 Tab 키가 모달 외부 요소로 빠져나갈 수 있음
  - 권장 해결: `focus-trap-react` 라이브러리 또는 수동 `keydown` 핸들러

## 스타일

- [ ] Dark mode 미구현
  - `globals.css`에 `@media (prefers-color-scheme: dark)` 블록 주석으로 예약됨
- [ ] 토스트 스택 관리 미구현
  - 현재 단일 Toast 컴포넌트 — 동시 다중 표시 불가
  - 중기 개선: `useToast` hook + `ToastProvider` Context 패턴

## 테스트

- [ ] E2E 자동화 테스트 미구현 (Playwright/Cypress)
  - 현재 수동 회귀 테스트로 검증
- [ ] 접근성 자동화 테스트 미구현 (axe-core 등)
