# Session 06: 주간 복기 리포트

> **세션 목표**: 주간 복기 리포트 생성과 Celery Beat 스케줄을 구현한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 모델 1개 + Celery Beat 스케줄
> **브랜치**: `feat/주간-복기-리포트` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/clean_code.md
Read .claude/rules/project_conventions.md
```

---

## 꼭지 1: WeeklyReport 모델 및 생성 서비스

```
backend/apps/reports/
├── models.py    # WeeklyReport
├── services.py  # generate_weekly_report(user_id, week_start)
├── selectors.py # get_latest_report(), get_report_history()
├── views.py
├── urls.py
└── tests/
```

**WeeklyReport 모델**
```python
class WeeklyReport(models.Model):
    user = ForeignKey(CustomUser, ...)
    week_start = DateField()
    week_end = DateField()
    capital_score = IntegerField()
    goal_achievement_rate = FloatField()    # 달성 목표 / 전체 목표
    journal_count = IntegerField()
    action_completion_rate = FloatField()   # 완료 행동 / 추천 행동
    highlights = JSONField(default=list)    # ["잘한 점 1", ...]
    improvements = JSONField(default=list)  # ["놓친 점 1", ...]
    next_week_action = CharField(max_length=200)
    ai_summary = TextField(blank=True)
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["user", "week_start"]]
```

**엔드포인트**
```
GET  /api/v1/reports/weekly/           # 내 리포트 목록
GET  /api/v1/reports/weekly/latest/    # 최신 리포트
POST /api/v1/reports/weekly/generate/  # 수동 생성 (개발/테스트용)
```

**완료 기준**
- [ ] 수동 생성 API로 리포트 생성 확인
- [ ] 리포트에 목표 달성률·일지 수·핵심 행동 포함 확인

**커밋**
```
feat(reports): 주간 복기 리포트 모델 및 생성 서비스 구현
```

---

## 꼭지 2: Celery Beat 자동 스케줄

```
backend/apps/reports/tasks.py

@shared_task
def generate_weekly_reports_for_all_users() -> None:
    """매주 월요일 09:00 전체 활성 사용자 주간 리포트 생성."""
```

`docker-compose.yml`에 celery beat 서비스 추가:
```yaml
celery_beat:
  build:
    context: ./backend
    target: development
  container_name: orneo_celery_beat
  command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
  env_file: .env
  volumes:
    - ./backend:/app
  networks:
    - orneo_net
  depends_on:
    - redis
    - db
  deploy:
    resources:
      limits:
        cpus: "0.25"
        memory: 256M
```

Django Admin에서 Periodic Tasks 관리 가능하도록 `django_celery_beat` 설정.

**완료 기준**
- [ ] `docker compose logs celery_beat` 에서 Beat 기동 확인
- [ ] Admin > Periodic Tasks 에서 스케줄 확인
- [ ] 수동 태스크 실행으로 전체 사용자 리포트 생성 확인

**커밋**
```
feat(reports): Celery Beat 주간 리포트 자동 스케줄 구현
```

---

## 꼭지 3: 백엔드 MVP 통합 테스트

Session 03~06 기능 전체가 연동되는지 E2E 흐름을 확인한다.

```
테스트 시나리오:
1. 회원가입 → 로그인 → 온보딩
2. 목표 3개 생성 (financial, housing, learning)
3. 일지 2개 작성 → AI 요약 생성 확인
4. 대시보드 점수 조회
5. 실거래가 조회 (성동구)
6. 주간 리포트 수동 생성 → 조회
```

`make test` 전체 통과 확인.

**완료 기준**
- [ ] 위 6단계 시나리오 API 호출 전체 성공
- [ ] `make test` 전체 통과
- [ ] `make lint` 오류 없음

**커밋**
```
test(integration): 백엔드 MVP E2E 통합 테스트 확인
```

---

## 세션 완료 후

```bash
git push origin feat/주간-복기-리포트
# PR: feat/주간-복기-리포트 → dev
# PR 제목: [feat] 주간 복기 리포트 & Celery Beat

# ★ [마일스톤 M2] 백엔드 MVP 완성
# Session 03~06 모두 dev 병합 완료 후:
# PR: dev → main (Merge Commit)
# git tag v0.2.0-backend-mvp

mv prompts/session_06_weekly_report.md prompts/_complete/
```

> **다음 세션**: session_07 에서 Next.js 프론트엔드를 시작한다.
