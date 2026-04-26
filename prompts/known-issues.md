# ORNEO — Known Issues (Session 31 기준)

> 마지막 업데이트: 2026-04-27

## 구현됨 (Session 25~31에서 완료)

- [x] Studio 실 기능 (일지 + 시나리오 연동)
- [x] Finance 실 데이터 (일지 + DART 검색)
- [x] MeasureMode 전역 Context
- [x] HeroScoreCard AI 요약 + 실 delta
- [x] AI 모델 설정 저장 (구조 마련)
- [x] 알림 토글 설정 저장

## 접근성

- [x] GoalCreateModal 포커스 트랩 — useFocusTrap 훅 적용 (Session 31)
- [x] ReviewModal 포커스 트랩 — useFocusTrap 훅 적용 (Session 31)
- [x] GoalProgressModal 포커스 트랩 — useFocusTrap 훅 적용 (Session 31)
- [x] Button point variant 색상 대비 — #0B132B 텍스트 적용 (Session 31)
- [ ] Dark mode 미구현 (다음 이터레이션)

## 기능

- [x] Toast 스택 관리 — ToastContext + useToast 훅 (Session 31)
  - 점진적 도입: 기존 Toast 컴포넌트 유지, 신규 코드에서 useToast() 사용

## 다음 이터레이션 예정

- [ ] Qwen/서버 고성능 모델 실제 연동 (현재 Gemma만 활성)
- [ ] 실제 푸시 알림 (Web Push / Email)
- [ ] Finance 화면 MOLIT 실거래가 이벤트 카드 (현재 DART만)
- [ ] Studio 화면 직접 주제 입력 → 일지 없이 시나리오 생성

## 스타일

- [ ] Dark mode 미구현
  - `globals.css`에 `@media (prefers-color-scheme: dark)` 블록 주석으로 예약됨

## 테스트

- [ ] E2E 자동화 테스트 미구현 (Playwright/Cypress)
  - 현재 수동 회귀 테스트로 검증
- [ ] 접근성 자동화 테스트 미구현 (axe-core 등)
