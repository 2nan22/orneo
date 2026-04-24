# Session 04: 의사결정 일지 & 라이프 캐피털 점수 API

> **세션 목표**: ORNEO 핵심 차별화 기능인 일지와 대시보드 점수를 구현한다.
> **예상 소요**: 2~2.5시간
> **작업량 기준**: 모델 2개 + 비동기 Celery 연동
> **브랜치**: `feat/일지-대시보드` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/clean_code.md
Read .claude/rules/project_conventions.md
Read .claude/skills/claude_agent_integration.md
```

---

## 꼭지 1: 의사결정 일지(journal) 앱 구현

```
backend/apps/journal/
├── models.py
├── serializers.py
├── views.py
├── services.py      # create_journal(), mark_reviewed()
├── selectors.py     # get_user_journals(), get_unreviewed()
├── urls.py
└── tests/
```

**JournalEntry 모델 핵심 필드**
```python
class JournalCategory(StrEnum):
    INVESTMENT = "investment"
    HOUSING = "housing"
    LEARNING = "learning"
    ROUTINE = "routine"
    GENERAL = "general"

class JournalEntry(models.Model):
    user = ForeignKey(CustomUser, ...)
    category = CharField(max_length=15)
    title = CharField(max_length=200)
    content = TextField()
    ai_summary = TextField(blank=True)      # Celery 비동기 생성
    action_items = JSONField(default=list)  # ["행동1", "행동2", ...]
    mood_score = IntegerField(null=True)    # 1~5
    related_goal = ForeignKey(Goal, null=True, blank=True, ...)
    reviewed_at = DateTimeField(null=True)
    review_note = TextField(blank=True)
    created_at = DateTimeField(auto_now_add=True)
```

**엔드포인트**
```
POST   /api/v1/journals/               # 생성 (비동기 요약 트리거)
GET    /api/v1/journals/               # 내 일지 목록 (카테고리 필터)
GET    /api/v1/journals/{id}/          # 상세
PATCH  /api/v1/journals/{id}/review/   # 복기 메모 작성
```

**완료 기준**
- [ ] 일지 생성 API → 즉시 응답 (요약은 비동기) 확인
- [ ] 복기 메모 저장 확인
- [ ] 테스트 통과

**커밋**
```
feat(journal): 의사결정 일지 CRUD 및 복기 API 구현
```

---

## 꼭지 2: Celery 비동기 AI 요약 연동

일지 저장 후 Celery 태스크로 AI 요약을 비동기 생성한다.

```python
# backend/apps/journal/tasks.py
@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def generate_journal_summary(self, journal_id: int) -> None:
    """일지 AI 요약 비동기 생성."""
    # 1. FastAPI /coach/summarize 호출
    # 2. 응답을 JournalEntry.ai_summary에 저장
    # 실패 시 재시도 (지수 백오프)
```

흐름:
1. `POST /api/v1/journals/` → 일지 저장 (즉시 201 응답)
2. `generate_journal_summary.delay(journal_id)` 큐 등록
3. Celery Worker → FastAPI `/coach/summarize` 호출
4. `JournalEntry.ai_summary` 업데이트

`docker-compose.yml`에 celery worker 서비스 추가:
```yaml
celery_worker:
  build:
    context: ./backend
    target: development
  container_name: orneo_celery_worker
  command: celery -A config worker -l info
  env_file: .env
  volumes:
    - ./backend:/app
  networks:
    - orneo_net
  depends_on:
    - redis
    - backend
  deploy:
    resources:
      limits:
        cpus: "0.50"
        memory: 512M
```

**완료 기준**
- [ ] 일지 생성 후 5초 내 `ai_summary` 업데이트 확인
- [ ] `docker compose logs celery_worker` 에서 태스크 실행 로그 확인
- [ ] AI 서비스 다운 시 재시도 후 실패 로그 확인 (앱은 정상 동작)

**커밋**
```
feat(journal): Celery 비동기 AI 요약 연동 및 Worker 서비스 추가
```

---

## 꼭지 3: 라이프 캐피털 점수 계산

```
backend/apps/dashboard/
├── models.py    # CapitalScoreSnapshot (일별 스냅샷)
├── services.py  # calculate_capital_score(user)
├── selectors.py # get_latest_score(), get_score_history()
├── views.py     # DashboardView
├── urls.py
└── tests/
```

**점수 계산 로직 (서비스 계층에 캡슐화)**
- 자산 안정성 40%: 활성 financial 목표의 progress 평균
- 목표 진척도 40%: 전체 활성 목표 progress 평균
- 루틴 점수 20%: 최근 7일 일지 작성 수 (max 7 → 100점)
- 종합: 가중합 × 100, 소수점 2자리 반올림

**대시보드 API 응답**
```json
{
  "capital_score": 78,
  "breakdown": {
    "asset_stability": 82,
    "goal_progress": 75,
    "routine_score": 70
  },
  "active_goals_count": 3,
  "recent_journal_count": 5,
  "today_actions": ["실거래가 변화 확인", "투자 가설 일지 작성"],
  "key_question": "지금 매수보다 현금 확보가 유리한가요?"
}
```

**완료 기준**
- [ ] `GET /api/v1/dashboard/` 응답 정상 확인
- [ ] 목표·일지 데이터 변경 시 점수 반영 확인
- [ ] 일별 스냅샷 DB 저장 확인

**커밋**
```
feat(dashboard): 라이프 캐피털 점수 계산 서비스 및 대시보드 API 구현
```

---

## 세션 완료 후

```bash
git push origin feat/일지-대시보드
# PR: feat/일지-대시보드 → dev
# PR 제목: [feat] 의사결정 일지 & 라이프 캐피털 대시보드 API
mv prompts/session_04_journal_dashboard.md prompts/_complete/
```
