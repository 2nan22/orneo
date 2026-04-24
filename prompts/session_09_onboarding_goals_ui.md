# Session 09: 온보딩 UI & 목표 관리 UI

> **세션 목표**: 신규 사용자 온보딩 플로우와 목표 관리 화면을 구현한다.
> **예상 소요**: 2~2.5시간
> **왜 필요한가**: 온보딩 없이는 신규 유저가 첫 화면에서 막힌다.
>              목표 데이터 없이는 대시보드 점수가 0점으로 표시된다.
> **브랜치**: `feat/온보딩-목표-ui` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/project_conventions.md
```

---

## 꼭지 1: 온보딩 멀티스텝 위자드

소셜 로그인 완료 후 `onboarded_at`이 null인 사용자는 `/onboarding`으로 리다이렉트한다.

**화면 흐름 (`/onboarding`)**

```
Step 1: 재무 정보
  - 월 저축 목표액 (슬라이더 또는 숫자 입력)
  - 총 자산 범위 선택 (3가지 옵션 카드)

Step 2: 주거 상태
  - 현재 상태 선택 (전세 / 월세 / 자가)
  - 희망 지역 입력 (선택)

Step 3: 투자 성향
  - 안정형 / 중립형 / 공격형 (설명 포함 카드)

Step 4: 학습 관심사
  - 태그 선택 (IT, 금융, 부동산, 자기계발, 언어 등)

Step 5: 완료
  - "오늘의 선택으로, 더 나은 나를." 메시지
  - "시작하기" → /dashboard 이동
```

**컴포넌트**
- `OnboardingLayout`: 프로그레스 바 + 단계 표시 (1/5)
- `StepCard`: 각 단계 공통 래퍼 (제목, 설명, 콘텐츠, 다음/이전 버튼)
- 단계별 입력 컴포넌트

**API 연동**
- 완료 시 `POST /api/v1/auth/onboarding/` 호출
- 성공 → `/dashboard` 리다이렉트
- `409` (이미 온보딩) → `/dashboard` 바로 이동

**middleware.ts 추가 처리**
```typescript
// 로그인 O + onboarded_at null → /onboarding 리다이렉트
// 로그인 O + onboarded_at 있음 → 통과
// /onboarding 접근 + onboarded_at 있음 → /dashboard 리다이렉트
```

**완료 기준**
- [ ] 5단계 스텝 이동 확인
- [ ] 완료 시 `onboarded_at` 저장 후 `/dashboard` 이동 확인
- [ ] 이미 온보딩한 사용자 재접근 → `/dashboard` 리다이렉트 확인

**커밋**
```
feat(frontend): 온보딩 멀티스텝 위자드 구현
```

---

## 꼭지 2: 목표 목록 화면

**화면 구성** (`/goals`)
- 상단: 카테고리 탭 (전체 / 금융 / 주거 / 학습 / 루틴)
- 목표 카드 리스트:
  - 카테고리 아이콘 + 배지
  - 제목 + 목표 날짜
  - 진척도 프로그레스 바 (progress × 100%)
  - 완료율 숫자 표시
- 우하단 FAB(+ 버튼) → 목표 생성 모달

**GoalCard 컴포넌트**
- 진척도 프로그레스 바 색상: Point Color `#00C2A8`
- 목표 날짜가 지났으면 "기한 초과" 배지 표시

**완료 기준**
- [ ] `/api/v1/goals/` 연동 및 카테고리 필터 동작 확인
- [ ] 진척도 바 표시 확인

**커밋**
```
feat(frontend): 목표 목록 화면 구현
```

---

## 꼭지 3: 목표 생성 모달

**GoalCreateModal 컴포넌트**
- 카테고리 선택 (라디오 버튼 카드)
- 제목 Input
- 설명 Textarea (선택)
- 목표 날짜 DatePicker (선택)
- 목표 금액 Input (금융 카테고리 선택 시만 표시)
- 저장 → `POST /api/v1/goals/`
- 저장 성공 → 모달 닫힘 + 목록 갱신

**완료 기준**
- [ ] 목표 생성 후 목록에 즉시 반영 확인
- [ ] 카테고리별 필드 조건부 표시 확인
- [ ] 저장 실패 시 에러 토스트 표시 확인

**커밋**
```
feat(frontend): 목표 생성 모달 구현
```

---

## 꼭지 4: 사이드바 & 공통 네비게이션

Session 07에서 레이아웃 뼈대를 만들었지만 실제 네비게이션이 미완성 상태다.
이 세션에서 완성한다.

**사이드바 메뉴 항목**

```
🏠  대시보드     /dashboard
📓  의사결정 일지  /journal
🎯  목표 관리    /goals
📊  주간 리포트  /reports
```

- 현재 경로에 따른 active 상태 표시
- ORNEO 로고 + "오르네오" 텍스트
- 하단: 프로필 아바타 + 이름 + 로그아웃 버튼
- 모바일: 사이드바 → 하단 탭바(BottomNav)로 전환 (375px 기준)

**완료 기준**
- [ ] 4개 메뉴 모두 이동 정상 확인
- [ ] active 상태 하이라이트 확인
- [ ] 모바일 375px에서 하단 탭바 전환 확인
- [ ] 로그아웃 → `/login` 이동 확인

**커밋**
```
feat(frontend): 사이드바 & 하단 탭바 공통 네비게이션 완성
```

---

## 세션 완료 후

```bash
git push origin feat/온보딩-목표-ui
# PR: feat/온보딩-목표-ui → dev
# PR 제목: [feat] 온보딩 UI & 목표 관리 UI
mv prompts/session_09_onboarding_goals_ui.md prompts/_complete/
```
