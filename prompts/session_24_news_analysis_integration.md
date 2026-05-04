# Session 24: 뉴스 분석 통합 (FastAPI + Django + Celery)

> **Session Goal**: `2026_AI-Agent` 프로젝트의 LangGraph 멀티-섹터 뉴스 분석을 oreneo에 통합.  
> FastAPI AI 서비스에 뉴스 분석 라우터 추가, Django 모델로 DB 영속화, Celery Beat 일일 자동 실행.  
> **Branch**: `feat/news-analysis` (oreneo `dev`에서 분기)  
> **예상 소요**: 2 ~ 2.5시간  
> **전제 조건**: Session 23 완료 (AI 검색·DART·ticker 기능)  
> **작업 디렉토리**: `/Users/2nan/Documents/Project/2026_oreneo`

---

## 세션 시작 전 주입

```
Read /Users/2nan/Documents/Project/2026_oreneo/docker-compose.yml
Read /Users/2nan/Documents/Project/2026_oreneo/backend/config/settings/base.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/config/celery.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/main.py
Read /Users/2nan/Documents/Project/2026_oreneo/ai_service/config.py
Read /Users/2nan/Documents/Project/2026_oreneo/backend/apps/public_data/tasks.py
```

---

## 배경 및 목표

oreneo는 개인 재정·의사결정 관리 웹 앱이다.  
기존 구조:
- **백엔드**: Django 5.2 + DRF, PostgreSQL 16, Redis
- **AI 서비스**: FastAPI 8001포트, Ollama(gemma4) + Tavily 기존 사용 중
- **Celery**: `django-celery-beat`, 현재 2개 스케줄 운영 중
- **AI 라우터 패턴**: `/ai_service/routers/{coach,decision,public_data}.py`

### 통합 아키텍처

```
Celery Beat (매일 08:00 KST)
  └─► Django Celery Task
        backend/apps/news/tasks.py::run_daily_news_analysis
          └─► HTTP POST http://ai_service:8001/news/analyze
                └─► FastAPI router (ai_service/routers/news.py)
                      └─► LangGraph 그래프 실행
                            └─► Tavily 검색 + Ollama 분석
                      └─► JSON 응답 반환
          └─► TBL_NEWS_ANALYSIS, TBL_NEWS_SECTOR_ANALYSIS 저장
Django REST API (향후 프론트엔드 연동)
```

### 최종 파일 변경 목록

```
2026_oreneo/
├── backend/
│   ├── apps/
│   │   └── news/                     ← (신규 Django 앱)
│   │       ├── __init__.py
│   │       ├── apps.py
│   │       ├── models.py             ← TBL_NEWS_ANALYSIS, TBL_NEWS_SECTOR_ANALYSIS, ...
│   │       ├── tasks.py              ← run_daily_news_analysis Celery 태스크
│   │       ├── serializers.py
│   │       ├── views.py
│   │       └── urls.py
│   └── config/
│       └── settings/
│           └── base.py               ← INSTALLED_APPS 추가, CELERY_BEAT_SCHEDULE 추가
├── ai_service/
│   ├── routers/
│   │   └── news.py                   ← (신규) POST /news/analyze
│   ├── services/
│   │   └── news_graph.py             ← (신규) LangGraph 그래프 이식
│   ├── main.py                       ← 뉴스 라우터 등록
│   └── requirements.txt              ← langgraph, langchain 추가
```

---

## 꼭지 1: Django `news` 앱 생성 + 모델 정의

**완료 기준:**
- [ ] `docker compose exec backend python manage.py check` 오류 없음

**커밋:**
```
feat(news): add news Django app with TBL_ schema models
```

---

## 꼭지 2: Django 마이그레이션 생성 + 시드 데이터

**완료 기준:**
- [ ] `docker compose exec backend python manage.py migrate` 성공
- [ ] `TBL_MARKET_SECTOR` 에 6개 섹터 출력

**커밋:**
```
feat(news): add migrations and sector seed data
```

---

## 꼭지 3: FastAPI 뉴스 분석 라우터 + LangGraph 이식

**완료 기준:**
- [ ] `docker compose build ai_service` 성공
- [ ] `curl -X POST http://localhost:8001/news/analyze ... '{"target_date":"2026-05-04","market":"KR","sectors":["반도체","AI"]}'` → JSON 응답

**커밋:**
```
feat(ai): add news analysis FastAPI router with LangGraph engine
```

---

## 꼭지 4: Celery 태스크 + Beat 스케줄 등록

**완료 기준:**
- [ ] Django shell에서 `run_daily_news_analysis('2026-05-04', 'KR', ['반도체', 'AI'])` 성공
- [ ] DB 확인: `TBL_NEWS_ANALYSIS` → COMPLETED 레코드

**커밋:**
```
feat(news): Celery task run_daily_news_analysis with DB persistence
chore(celery): register daily news analysis beat schedule at 08:00 KST
```

---

## 꼭지 5: E2E 검증

**완료 기준:**
- [ ] FastAPI `/news/analyze` → JSON 응답 (overall_analysis, sector_analyses, run_duration_ms)
- [ ] `TBL_NEWS_ANALYSIS` 에 COMPLETED 레코드 생성
- [ ] `TBL_NEWS_SECTOR_ANALYSIS` 에 섹터별 레코드 생성
- [ ] Celery Beat 스케줄 등록 확인

---

## 세션 종료

```bash
cd /Users/2nan/Documents/Project/2026_oreneo
git push origin feat/news-analysis
gh pr create \
  --base dev \
  --title "[feat] 뉴스 분석 통합 — FastAPI + Django + Celery" \
  --body "..."

gh pr merge <N> --merge --delete-branch --subject "..." --body "..."
git checkout dev && git pull origin dev
git branch -d feat/news-analysis

mv prompts/session_24_news_analysis_integration.md prompts/_complete/
```

---

## 참고: oreneo 기존 패턴

| 위치 | 참고 목적 |
|------|---------|
| `backend/apps/public_data/tasks.py` | Celery 태스크 패턴 |
| `ai_service/routers/public_data.py` | FastAPI 라우터 패턴 (X-Service-Secret 인증) |
| `ai_service/services/gemma_client.py` | LLM 클라이언트 패턴 |
