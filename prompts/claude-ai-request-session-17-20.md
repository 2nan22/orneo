# Claude.ai 요청 — Session 17~20 프롬프트 파일 생성

> 이 파일을 claude.ai에 붙여넣어 세션 프롬프트 파일 4개를 생성 요청한다.

---

## 요청 내용

아래 프로젝트 컨텍스트를 읽고, **Session 17 ~ Session 20** 세션 프롬프트 파일 4개를 생성해줘.
각 파일은 `prompts/session_17_*.md` 형식으로, 기존 세션 프롬프트 형식을 그대로 따라야 한다.

---

## 프로젝트 컨텍스트: ORNEO

**프로젝트 성격**: 금융·자기계발·주거를 하나의 "라이프 캐피털 대시보드"로 묶는 개인 의사결정 앱.  
**슬로건**: 오늘의 선택으로, 더 나은 나를.  
**핵심 루프**: 목표 설정 → 오늘의 상태 입력 → AI 요약 → 오늘 할 행동 1~3개 → 주간 복기

### 기술 스택

| 계층 | 기술 |
|------|------|
| 메인 백엔드 | Django 5.2, DRF, Celery, PostgreSQL |
| AI/비동기 서비스 | FastAPI (ai_service) |
| AI 모델 | **Gemma4 via Ollama** (온디바이스·서버 모두) |
| 웹 프론트 | Next.js 16 (App Router), React, Tailwind CSS v4 |
| 공공 데이터 | 국토부 실거래가(MOLIT), OPEN DART, K-MOOC |

> ⚠️ **중요 제약**: Claude Agent SDK / OpenAI API를 사용하지 않는다.
> 모든 AI 기능은 **Gemma4 (Ollama)** 로 구현한다. 나중에 Claude/GPT는 중기 작업으로 추가.

### 디렉터리 구조 (핵심만)

```
orneo/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # 사용자·인증
│   │   ├── goals/            # 목표 관리
│   │   ├── journal/          # 의사결정 일지
│   │   ├── dashboard/        # 라이프 캐피털 대시보드
│   │   └── reports/          # 주간 복기 리포트
│   └── config/               # settings, celery
├── ai_service/
│   ├── routers/
│   │   ├── coach.py          # POST /coach/summarize (Gemma)
│   │   └── public_data.py    # GET /public-data/apartments|dart|kmooc
│   ├── services/
│   │   ├── gemma_client.py   # GemmaClient (Ollama REST)
│   │   └── public_data/
│   │       ├── molit.py      # 국토부 실거래가
│   │       ├── dart.py       # OPEN DART
│   │       └── kmooc.py      # K-MOOC
│   └── schemas/coach.py
└── frontend/
    ├── src/app/(app)/
    │   ├── dashboard/page.tsx
    │   ├── journal/page.tsx
    │   ├── goals/page.tsx
    │   ├── reports/page.tsx
    │   └── settings/page.tsx  ← stub 상태
    └── src/components/
        ├── ui/               # Button, Card, Input, Toast, PageContainer
        └── dashboard/        # CapitalScoreGauge, ScoreBreakdown, TodayActions, KeyQuestion
```

---

## 현재 구현 상태 (Session 1~16 완료 후)

### 백엔드 — 완성된 것

- Django 인증 (소셜 로그인 Google/Kakao/Naver, JWT)
- Goals CRUD (목표 생성·수정·진척도 업데이트)
- Journal CRUD (일지 작성·복기·카테고리 필터)
- Dashboard `CapitalScoreSnapshot` 모델 (일별 점수 스냅샷)
- Dashboard `DashboardView` — 점수 계산해서 반환하지만 `today_actions: []`, `key_question: ""` **빈 값 하드코딩**
- Weekly Report 생성 (Celery task)

### 백엔드 — 미완성

```python
# backend/apps/dashboard/views.py (현재 상태)
return Response({
    "status": "success",
    "data": {
        "capital_score": result.capital_score,
        "breakdown": { ... },
        "today_actions": [],      # ← 빈 값! Gemma로 생성 필요
        "key_question": "",       # ← 빈 값! Gemma로 생성 필요
    },
})
```

- `TodayAction` 모델 없음 (하루 행동 3개를 DB에 저장하는 구조 필요)
- 일일 행동·질문 생성 Celery beat 태스크 없음

### AI 서비스 — 완성된 것

```python
# ai_service/services/gemma_client.py
# GemmaClient: Ollama REST API 호출, fallback 처리 완성

# ai_service/routers/coach.py
# POST /coach/summarize
# 일지 텍스트 → Gemma → 요약 2~3문장 + 행동 3개 반환

# ai_service/routers/public_data.py
# GET /public-data/apartments/transactions?lawd_cd=...&deal_ymd=...
# GET /public-data/dart/disclosures?corp_name=...
# GET /public-data/kmooc/courses?keyword=...
# → 공공 API 클라이언트 완성, FastAPI 라우터 완성
```

### AI 서비스 — 미완성

- `POST /coach/daily-actions` 없음
  - 입력: 사용자 목표 목록 + 최근 일지 3개 → 출력: 오늘 행동 3개 + 핵심 질문 1개
- `POST /decision/scenarios` 없음 (DecisionStudio용 A/B/C 시나리오 생성)

### Celery 태스크 — 완성된 것

```python
# backend/apps/journal/tasks.py
# generate_journal_summary(journal_id)
# → ai_service POST /coach/summarize 호출 → JournalEntry.ai_summary 저장
# → 일지 생성 시 on_commit으로 트리거
```

### 프론트엔드 — 완성된 것

- 모든 화면 UI (Session 11~16에서 완성)
- 디자인 토큰 (색상, 그림자, radius)
- 공통 컴포넌트: Button, Card, Input, Toast, PageContainer (variant/size/a11y 포함)
- 레이아웃: 모바일 헤더, 하단 nav (safe area), 데스크톱 사이드바
- 대시보드: 2컬럼 그리드, Skeleton 로딩, Error state, TodayActions 체크박스

### 프론트엔드 — 미완성

- `today_actions`가 빈 배열이라 대시보드에서 항상 empty state 표시
- `key_question`이 빈 문자열이라 KeyQuestion 카드 아예 안 보임
- 공공 데이터가 화면에 표시되지 않음 (MOLIT·DART·K-MOOC API는 준비됐지만 UI 없음)
- DecisionStudio 컴포넌트 없음 (프로토타입에서 가장 차별화된 UI)
- 설정 페이지 프로필 편집 없음 (로그아웃 버튼만 있는 stub)
- 점수 델타(전주 대비 변화) 표시 없음

---

## 프로토타입에서 구현해야 할 UI 참고

아래는 `.claude/orneo-dashboard-ui-prototype.jsx`의 핵심 컴포넌트들이다.

### `GoalGrid` — 3-컬럼 지표 카드 (미구현)
```jsx
// 자산안정성/목표진척/루틴을 3개 카드에 표시
// 각 카드: 아이콘 + 레이블 + 수치 + 델타("+5", "+12%")
const goals = [
  { label: "자산 안정성", value: "85", delta: "+5",   icon: "wallet" },
  { label: "목표 진척",   value: "72%", delta: "+12%", icon: "target" },
  { label: "이번 주 루틴", value: "3",  delta: "완료", icon: "note" },
];
```

### `ActionList` — 번호형 행동 목록 (현재는 체크박스 버전만)
```jsx
// 현재 구현된 TodayActions는 체크박스 방식
// 프로토타입은 번호 원형(1,2,3) + 카테고리 태그 방식
// → 두 스타일을 합쳐 번호 + 체크박스 + 카테고리 태그로 개선
```

### `DecisionStudio` — 시나리오 비교 (미구현)
```jsx
// "성동구 전세 vs 외곽 매수" 주제에 대해 A/B/C 시나리오
// 각 시나리오: 제목 + 리스크 수준 + 설명
// 근거 데이터 칩: 실거래가, 대출 부담, 저축 속도
const scenarios = [
  { title: "A. 지금 매수",     risk: "높음", copy: "현금 여유가 빠르게 줄어들 수 있어요." },
  { title: "B. 1년 현금 축적", risk: "중간", copy: "목표 달성 확률과 심리 안정성이 균형적이에요." },
  { title: "C. 지역 대체안",   risk: "낮음", copy: "통근·학습 시간을 보존하며 부담을 낮춰요." },
];
```

---

## 기존 세션 프롬프트 형식 (이 형식을 그대로 따를 것)

```markdown
# Session N: [세션 제목]

> **세션 목표**: [한 줄 목표]
> **예상 소요**: [시간]
> **작업량 기준**: [특징]
> **브랜치**: `feat/english-branch-name` (dev에서 분기)
> **선행 세션**: Session N-1 dev 병합 완료 필수

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/project_conventions.md
Read .claude/rules/git_workflow.md
Read .claude/memory/feedback_git_workflow.md
[세션별 추가 rules]
```

---

## 꼭지 N: [꼭지 제목]

**목표**: [구체적 목표]

### N-1. [세부 항목]

[구체적인 코드 스니펫, 파일 경로, API 형식 포함]

**완료 기준**
- [ ] 항목 1
- [ ] 항목 2

**커밋**
```
type(scope): 커밋 메시지
```

---

## 세션 완료 후

```bash
git push origin feat/branch-name

gh pr create \
  --base dev \
  --title "[feat] PR 제목" \
  --body "$(cat <<'EOF'
## 개요
...
## 변경 사항
- [ ] 항목
## 테스트
- [ ] 항목
## 체크리스트
- [ ] Google Style Docstring
- [ ] Type Hinting
- [ ] logging 모듈 사용 (print 없음)
- [ ] 환경변수 하드코딩 없음
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/branch-name" \
  --body "$(cat <<'EOF'
[feat] PR 제목

- 구현 내용 1
- 구현 내용 2
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/branch-name

mv prompts/session_N_*.md prompts/_complete/
```
```

---

## 생성할 세션 목록과 범위

### Session 17: Dashboard AI 연결 (Gemma4 → today_actions + key_question)

**목적**: 대시보드의 빈 `today_actions`와 `key_question`을 Gemma4로 생성하여 채운다.

**작업 범위**:

1. **ai_service 신규 라우터**: `POST /coach/daily-actions`
   - 입력: 사용자의 활성 목표 목록(카테고리·제목·진척도) + 최근 3일 일지 요약
   - Gemma 프롬프트: 목표와 일지 맥락을 보고 오늘 취할 구체적 행동 3개 + 핵심 질문 1개 생성
   - 출력 JSON 형식:
     ```json
     {
       "actions": [
         {"text": "실거래가 변화 5분 확인", "category": "housing"},
         {"text": "투자 가설 1줄 기록", "category": "investment"},
         {"text": "K-MOOC 20분 학습", "category": "learning"}
       ],
       "key_question": "지금 매수보다 현금 확보가 유리할까요?",
       "model_used": "gemma4:e2b"
     }
     ```
   - Gemma fallback: 규칙 기반 기본 행동 3개 반환 (서비스 중단 없이)

2. **Django 백엔드**: `TodayAction` 모델 추가
   ```python
   class TodayAction(models.Model):
       user = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE)
       text = models.CharField(max_length=200)
       category = models.CharField(max_length=20)
       completed = models.BooleanField(default=False)
       action_date = models.DateField()  # 오늘 날짜
       created_at = models.DateTimeField(auto_now_add=True)
   ```

3. **Django 백엔드**: `DailyKeyQuestion` 모델 추가
   ```python
   class DailyKeyQuestion(models.Model):
       user = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE)
       question = models.TextField()
       question_date = models.DateField()
       created_at = models.DateTimeField(auto_now_add=True)
   ```

4. **Celery beat 태스크**: `generate_daily_actions_for_all_users`
   - 매일 오전 6시 실행 (Celery Beat + django-celery-beat)
   - 각 사용자별로 ai_service `/coach/daily-actions` 호출
   - `TodayAction`, `DailyKeyQuestion` DB 저장

5. **DashboardView 업데이트**: `today_actions`·`key_question` DB에서 읽어 반환

6. **프론트엔드 TodayActions 개선**: 번호 원형(1,2,3) + 카테고리 태그 추가 (프로토타입 스타일)

7. **마이그레이션 + admin 등록**

**브랜치**: `feat/dashboard-ai-daily-actions`

---

### Session 18: 공공 데이터 프론트 연결

**목적**: ai_service에 완성된 공공 데이터 API(MOLIT·DART·K-MOOC)를 프론트엔드에 연결해 실제 데이터를 화면에 표시한다.

**작업 범위**:

1. **Next.js API 프록시 라우트** 신설
   - `app/api/public-data/apartments/route.ts` → `AI_SERVICE_URL/public-data/apartments/transactions`
   - `app/api/public-data/kmooc/route.ts` → `AI_SERVICE_URL/public-data/kmooc/courses`
   - `app/api/public-data/dart/route.ts` → `AI_SERVICE_URL/public-data/dart/disclosures`
   - 서버사이드에서만 `AI_SERVICE_URL` 참조 (SSRF 방지, 브라우저에 ai_service URL 노출 금지)
   - Django 백엔드를 거치지 않고 Next.js에서 직접 ai_service 호출

2. **대시보드 - 실거래가 카드** 신설
   - 사용자의 주거 목표(`category="housing"`)가 있는 경우만 표시
   - 온보딩에서 입력한 희망 지역의 최근 실거래가 5건 표시
   - 법정동 코드(`lawd_cd`)는 사용자 프로필의 `preferred_region` 필드에서 읽음
   - 데이터 없거나 오류: 카드 숨김 (에러 노출 금지)
   - 반드시 하단에 "출처: 국토교통부 실거래가 자료 (참고용)" 표기

3. **목표 화면 - K-MOOC 추천 카드** 신설
   - 사용자의 학습 목표(`category="learning"`) 제목을 키워드로 K-MOOC 검색
   - 관련 강좌 3개를 목표 카드 하단에 표시 ("관련 강좌 보기" 접기/펼치기)
   - 출처 표기 필수

4. **일지 화면 - DART 컨텍스트 배지** 신설
   - 투자 일지(`category="investment"`) 제목에서 종목명 추출 (간단한 정규식)
   - DART 최근 공시 1건 배지로 표시 ("삼성전자 최근 공시 있음 →")
   - 로딩 실패 시 배지 숨김 (필수 아닌 보조 정보)

5. **공통 처리**
   - 각 카드에 로딩 skeleton 적용
   - 공공 데이터는 SWR 또는 `useEffect` + 5분 캐시 (빈번한 호출 방지)
   - 투자 면책 고지: "이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다."

**브랜치**: `feat/public-data-frontend`

---

### Session 19: DecisionStudio UI + Gemma 시나리오 생성

**목적**: 프로토타입에서 가장 차별화된 기능인 DecisionStudio를 구현한다. 의사결정 일지와 연결된 A/B/C 시나리오를 Gemma4가 생성하고, 프론트엔드에 표시한다.

**작업 범위**:

1. **ai_service 신규 라우터**: `POST /decision/scenarios`
   - 입력:
     ```json
     {
       "topic": "성동구 전세 vs 외곽 매수",
       "context": {
         "category": "housing",
         "user_goals": ["2년 내 내 집 마련", "월 저축 150만원"],
         "recent_data": ["실거래가 하락 3개월 연속", "대출금리 4.5%"]
       }
     }
     ```
   - Gemma 프롬프트: 주제와 맥락을 바탕으로 A/B/C 3가지 선택지, 각각 리스크 수준(높음/중간/낮음), 한 줄 설명 생성
   - 출력:
     ```json
     {
       "topic": "성동구 전세 vs 외곽 매수",
       "evidence_chips": ["실거래가", "대출 부담", "저축 속도"],
       "scenarios": [
         {"id": "A", "title": "지금 매수",     "risk": "높음", "description": "현금 여유가 빠르게 줄어들 수 있어요."},
         {"id": "B", "title": "1년 현금 축적", "risk": "중간", "description": "목표 달성 확률과 심리 안정성이 균형적이에요."},
         {"id": "C", "title": "지역 대체안",   "risk": "낮음", "description": "통근·학습 시간을 보존하며 부담을 낮춰요."}
       ],
       "model_used": "gemma4:e2b",
       "disclaimer": "이 시뮬레이션은 참고용이며 투자·부동산 권유가 아닙니다."
     }
     ```

2. **Django 백엔드**: `DecisionScenario` 모델 (결과 저장·재활용)
   ```python
   class DecisionScenario(models.Model):
       journal_entry = models.OneToOneField("journal.JournalEntry", on_delete=models.CASCADE)
       topic = models.CharField(max_length=200)
       evidence_chips = models.JSONField(default=list)
       scenarios = models.JSONField(default=list)
       generated_at = models.DateTimeField(auto_now_add=True)
   ```
   - 동일 `journal_entry`에 대해 중복 생성 방지 (이미 있으면 기존 반환)

3. **Celery 태스크**: `generate_decision_scenarios(journal_id)`
   - 일지 저장 후 `transaction.on_commit`에서 트리거
   - `generate_journal_summary`와 병렬 실행
   - ai_service `/decision/scenarios` 호출 후 결과 저장

4. **프론트엔드**: `DecisionStudio.tsx` 컴포넌트
   - 프로토타입 디자인을 그대로 구현:
     ```tsx
     // 카드 상단: 주제 + eyebrow "Decision Studio"
     // 근거 데이터 칩 (evidence_chips)
     // A/B/C 시나리오 카드 (제목 + 리스크 배지 + 설명)
     // 하단: 면책 고지 텍스트
     ```
   - 리스크 배지 색상: 높음=danger, 중간=warning, 낮음=point
   - 로딩 중: "AI가 시나리오를 분석 중이에요..." 스켈레톤

5. **일지 상세 연동**: `ReviewModal` 또는 `JournalDetailPage`에 DecisionStudio 통합
   - 일지 복기 모달 하단에 DecisionStudio 카드 표시
   - `category`가 `investment` 또는 `housing`인 경우만 표시
   - `is_reviewed: false` 상태에서 "AI 분석 요청" 버튼 → 생성 트리거

**브랜치**: `feat/decision-studio`

---

### Session 20: GoalGrid 델타 + 설정 프로필 편집

**목적**: 대시보드 점수 카드에 전주 대비 변화량을 추가하고, 설정 페이지 프로필 편집을 완성한다.

**작업 범위**:

1. **Django 백엔드 - 델타 계산**
   - `DashboardView`에서 이번 주 점수와 지난주 점수 비교
   - `CapitalScoreSnapshot` 모델에 이미 일별 스냅샷 저장됨
   - 응답에 추가:
     ```json
     {
       "score": 78,
       "delta": { "score": +8, "asset_stability": +5, "goal_progress": +12, "routine_score": -2 }
     }
     ```
   - 스냅샷 없으면 `delta: null` 반환

2. **프론트엔드 - GoalGrid 컴포넌트** 신설
   - 프로토타입의 3-컬럼 카드 디자인 구현:
     ```tsx
     // 자산안정성 / 목표진척 / 루틴 3개 카드
     // 각 카드: 아이콘 + 레이블 + 수치 + 델타 배지
     // 델타 양수: point 색상 "+8" / 음수: danger 색상 "-2" / null: 없음
     ```
   - `CapitalScoreGauge` 아래 배치

3. **프론트엔드 - ScoreBreakdown 델타 표시**
   - 기존 `ScoreBreakdown.tsx`에 delta prop 추가
   - 각 항목 오른쪽에 delta 배지 표시

4. **설정 페이지 프로필 편집**
   - `GET /api/v1/auth/profile/` → 현재 사용자 정보 불러오기
   - `PATCH /api/v1/auth/profile/` → 이름, 리스크 성향(conservative/moderate/aggressive), 희망 지역 코드 수정
   - 폼 컴포넌트: `Input`, `Button`, `Toast` 공통 컴포넌트 사용
   - 온보딩 재설정 진입 버튼 (→ `/onboarding` 리다이렉트)

5. **설정 페이지 알림 설정 (stub)**
   - "일일 행동 알림" 토글 (DB 저장은 다음 이터레이션)
   - 현재는 UI만 구현, 실제 푸시 알림 없음

6. **마이그레이션 + admin 등록** (필요한 경우)

**브랜치**: `feat/goalGrid-delta-settings`

---

## 요청 사항

위 4개 세션의 프롬프트 파일을 아래 조건으로 생성해줘:

1. **파일명**: `session_17_dashboard_ai.md`, `session_18_public_data_frontend.md`, `session_19_decision_studio.md`, `session_20_goalGrid_settings.md`

2. **형식**: 이 문서에서 예시로 보여준 기존 세션 형식 그대로  
   - 상단 메타 블록 (목표, 소요, 브랜치, 선행 세션)
   - "작업 전 주입 필수" 섹션
   - 꼭지별 구성 (세부 작업 → 완료 기준 → 커밋 메시지)
   - "세션 완료 후" 블록 (git push → gh pr create → gh pr merge → cleanup → mv)

3. **코드 스니펫**: 각 파일에 구체적인 파일 경로, 함수 시그니처, 모델 정의, API 엔드포인트 형식 포함  
   (Claude Code가 파일을 열지 않고도 어디에 무엇을 써야 하는지 알 수 있을 정도로)

4. **완료 기준**: 체크박스 형식으로 5개 이상, 검증 가능한 조건으로 작성  
   (예: "curl로 /coach/daily-actions 호출 시 actions 3개 반환 확인")

5. **AI 제약 명시**: 각 세션 내 AI 관련 꼭지에 반드시 한 줄 주석 포함  
   `> ⚠️ Claude Agent SDK 사용 금지. Gemma4 (Ollama) 만 사용.`

6. **규제 고지**: 공공 데이터(MOLIT·DART) 관련 코드에 "참고용, 투자 권유 아님" 문구 포함 필수

7. **세션별 예상 소요**: Session 17은 2~2.5시간, 18·19·20은 각 1.5~2시간

8. **세션 간 의존성 명시**: Session 17 완료 후 18 시작, 19는 17 완료 후 시작 가능, 20은 독립적으로 진행 가능

생성한 파일 4개를 각각 코드블록으로 출력해줘.
