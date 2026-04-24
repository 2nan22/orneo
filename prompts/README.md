# Prompts — 세션별 작업 관리

## 세션 목록

| 파일 | 목표 | 예상 소요 | 상태 |
|------|------|---------|------|
| `session_01_git_docker.md` | Git 초기화 & Docker Compose 인프라 | 1~1.5h | ⬜ |
| `session_02_backend_skeleton.md` | Django & FastAPI 백엔드 뼈대 | 1.5~2h | ⬜ |
| `session_03_auth_goals.md` | 소셜 로그인 & 목표 설정 API | 2~2.5h | ⬜ |
| `session_04_journal_dashboard.md` | 의사결정 일지 & 라이프 캐피털 점수 | 2~2.5h | ⬜ |
| `session_05_public_data_coach.md` | 공공 데이터 연동 & Gemma 코치 | 2~2.5h | ⬜ |
| `session_06_weekly_report.md` | 주간 복기 리포트 & Celery Beat | 1.5~2h | ⬜ |
| `session_07_frontend_auth.md` | Next.js 초기화 & 소셜 로그인 화면 | 1.5~2h | ⬜ |
| `session_08_dashboard_journal_ui.md` | 대시보드 & 일지 UI | 2~2.5h | ⬜ |
| `session_09_onboarding_goals_ui.md` | 온보딩 UI & 목표 관리 UI | 2~2.5h | ⬜ |
| `session_10_report_ui_integration.md` | 주간 리포트 UI & E2E 통합 마무리 | 2~2.5h | ⬜ |

완료된 세션 파일 → `_complete/` 로 이동.

---

## MVP 완성 기준

10개 세션 완료 후 아래 흐름이 끊김 없이 동작하면 MVP 완성:

```
소셜 로그인 → 온보딩 → 대시보드(점수 표시)
  → 목표 생성 → 일지 작성 → AI 요약 생성
  → 일지 복기 → 주간 리포트 확인
```

---

## main 병합 마일스톤

| 마일스톤 | 포함 세션 | 태그 |
|---------|---------|------|
| **M1 인프라** | 01~02 완료 후 | `v0.1.0-infra` |
| **M2 백엔드 MVP** | 03~06 완료 후 | `v0.2.0-backend-mvp` |
| **M3 MVP 완성** | 07~10 완료 후 | `v0.3.0-mvp` |

---

## Git 흐름 요약

```
feat/* ─(Squash Merge)→ dev ─(Merge Commit)→ main
         (세션 단위)        (마일스톤 단위)
```

---

## 세션 시작 템플릿

```
다음 파일들을 읽고 [세션명] 작업을 시작해줘:
- .claude/CLAUDE.md
- .claude/rules/clean_code.md
- .claude/rules/git_workflow.md
- .claude/rules/logging.md
- .claude/rules/project_conventions.md
- [추가 rules/skills]
- prompts/session_0X_xxx.md

현재 브랜치 확인 후 꼭지 1부터 시작해줘.
```

---

## 꼭지 완료 체크

각 꼭지 완료 시:
- [ ] 완료 기준 항목 확인
- [ ] 커밋 메시지 컨벤션 준수
- [ ] `git push origin feat/...`

세션 종료 시:
- [ ] PR 생성 (`feat/* → dev`)
- [ ] 세션 파일 `_complete/` 이동
