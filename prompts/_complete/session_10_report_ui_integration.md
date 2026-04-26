# Session 10: 주간 리포트 UI & E2E 통합 마무리

> **세션 목표**: 주간 복기 리포트 UI를 완성하고 전체 MVP 흐름을 E2E로 검증한다.
> **예상 소요**: 2~2.5시간
> **왜 필요한가**: 리포트 UI 없이는 ORNEO의 핵심 루프(행동 → 복기)가 끊긴다.
>              E2E 없이는 프론트-백엔드 연동 오류를 발견하지 못한 채 배포된다.
> **브랜치**: `feat/리포트-ui-통합` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/project_conventions.md
Read .claude/rules/django.md
Read .claude/memory/feedback_git_workflow.md
Read .claude/rules/git_workflow.md
```

---

## 꼭지 1: 기술 연동 설정 (CORS + API 환경변수)

이 꼭지가 없으면 프론트엔드가 백엔드에 요청 자체를 보내지 못한다.

**Django CORS 설정**

```
requirements/base.txt 추가:
django-cors-headers==4.*
```

```python
# config/settings/base.py
INSTALLED_APPS += ["corsheaders"]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # 최상단에 위치
    ...
]
```

```python
# config/settings/dev.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

# config/settings/prod.py
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")
```

**Django 헬스체크 엔드포인트**

docker-compose의 healthcheck에서 참조하지만 구현이 없었다.

```python
# config/urls.py 에 추가
path("health/", lambda request: JsonResponse({"status": "ok"})),
```

**Next.js API 환경변수**

```
frontend/.env.local (gitignore 대상)
frontend/.env.example (커밋 대상)
```

```bash
# frontend/.env.example
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
```

```typescript
// frontend/src/lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
```

**.env.example 루트에 추가**
```bash
# Frontend
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

**완료 기준**
- [ ] `POST /api/v1/auth/social/google/` 브라우저에서 CORS 오류 없이 호출 확인
- [ ] `GET /health/` → `{"status": "ok"}` 응답 확인
- [ ] `./dc.sh dev ps` 모든 서비스 `healthy` 상태 확인

**커밋**
```
feat(backend): CORS 설정 및 헬스체크 엔드포인트 추가
feat(frontend): API URL 환경변수 및 클라이언트 설정
```

---

## 꼭지 2: 주간 복기 리포트 화면

**화면 구성** (`/reports`)

**리포트 목록 (최신 리포트 상단 고정)**
```
┌──────────────────────────────┐
│ 이번 주 복기 리포트          │
│ 2025년 1월 2주차             │
├──────────────────────────────┤
│ 행동 달성률         67%      │
│ 일지 작성           5건      │
│ 라이프 캐피털 점수  78점     │
├──────────────────────────────┤
│ 잘한 점                      │
│ • 지출 통제                  │
│ • 학습 루틴 유지              │
├──────────────────────────────┤
│ 놓친 점                      │
│ • 투자 일지 미작성            │
├──────────────────────────────┤
│ 다음 주 핵심 행동             │
│ "매수 근거 먼저 쓰고 주문 보류"│
└──────────────────────────────┘
```

**컴포넌트**
- `WeeklyReportCard`: 한 주 리포트 요약 카드
- `AchievementBar`: 달성률 프로그레스 바
- `HighlightList`: 잘한 점 / 놓친 점 리스트
- `NextActionCard`: 다음 주 핵심 행동 강조 카드

**리포트가 없을 때** → "아직 리포트가 없습니다. 매주 월요일에 자동 생성됩니다." + 수동 생성 버튼

**완료 기준**
- [ ] `/api/v1/reports/weekly/latest/` API 연동 확인
- [ ] 리포트 없을 때 빈 상태 화면 표시 확인
- [ ] 수동 생성 버튼 → `POST /api/v1/reports/weekly/generate/` 호출 확인

**커밋**
```
feat(frontend): 주간 복기 리포트 화면 구현
```

---

## 꼭지 3: pyproject.toml 생성

`clean_code.md`에 명시된 Ruff·mypy 설정 파일을 실제로 생성한다.

```
backend/pyproject.toml
ai_service/pyproject.toml
```

```toml
# backend/pyproject.toml
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "C4", "SIM"]
ignore = ["E501"]

[tool.ruff.lint.isort]
known-first-party = ["apps", "config"]

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
plugins = ["mypy_django_plugin.main"]

[tool.django-stubs]
django_settings_module = "config.settings.dev"

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.dev"
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
```

**완료 기준**
- [ ] `./dc.sh dev lint` 통과 (경고는 허용, 오류 없음)
- [ ] `./dc.sh dev test` 통과

**커밋**
```
chore(quality): pyproject.toml Ruff·mypy·pytest 설정 추가
```

---

## 꼭지 4: MVP 전체 E2E 흐름 검증

**검증 시나리오 (수동 테스트)**

```
1. 소셜 로그인 (Google 개발자 콘솔에서 테스트 계정 사용)
   → JWT 발급 확인

2. 온보딩
   → 5단계 완료 → /dashboard 이동 확인
   → Admin에서 onboarded_at 저장 확인

3. 목표 3개 생성
   → 금융: "6개월 내 500만원 저축"
   → 주거: "내년까지 성동구 실거래가 파악"
   → 학습: "데이터 분석 K-MOOC 완주"

4. 대시보드 점수 확인
   → 목표 생성 후 capital_score 변화 확인

5. 일지 작성
   → "삼성전자 분할 매수 고려 이유 기록"
   → 5초 내 AI 요약 생성 확인 (Ollama 실행 중인 경우)
   → Gemma fallback 동작 확인 (Ollama 중단 후 재시도)

6. 일지 복기
   → 작성한 일지 → 복기 메모 작성
   → "복기 필요" → "복기 완료" 배지 변경 확인

7. 주간 리포트 수동 생성
   → /reports → "생성" 버튼 → 리포트 카드 표시 확인

8. 로그 확인
   → ./dc.sh dev logs backend (일지 생성 로그 확인)
   → ./dc.sh dev logs worker  (Celery 태스크 로그 확인)
   → logs/backend/ 폴더에 일별 로그 파일 생성 확인
```

**완료 기준**
- [ ] 위 8단계 시나리오 전체 성공
- [ ] `./dc.sh dev lint` 오류 없음
- [ ] `./dc.sh dev test` 전체 통과
- [ ] 로그 파일 생성 확인 (`logs/backend/orneo_backend.log`)

**커밋**
```
test(e2e): MVP 전체 E2E 흐름 검증 완료
```

---

## 세션 완료 후

```bash
git push origin feat/리포트-ui-통합
# PR: feat/리포트-ui-통합 → dev
# PR 제목: [feat] 주간 리포트 UI & E2E 통합 마무리

# ★ [마일스톤 M3] MVP 완성
# Session 07~10 모두 dev 병합 완료 후:
# PR: dev → main (Merge Commit)
# git tag v0.3.0-mvp

mv prompts/session_10_report_ui_integration.md prompts/_complete/
```
