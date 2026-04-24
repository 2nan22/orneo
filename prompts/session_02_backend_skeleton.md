# Session 02: Django & FastAPI 백엔드 뼈대

> **세션 목표**: Django 메인 앱과 FastAPI AI 서비스의 실행 가능한 뼈대를 만든다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 뼈대 코드 위주 / 비즈니스 로직 없음
> **브랜치**: `feat/백엔드-뼈대` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/docker.md
Read .claude/rules/fastapi.md
Read .claude/rules/clean_code.md
```

---

## 꼭지 1: Django 백엔드 디렉터리 구조 & 설정

```
backend/
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py       # 공통 설정
│   │   ├── dev.py        # 개발 환경 (DEBUG=True)
│   │   └── prod.py       # 운영 환경
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/                 # 비어있음 (이후 세션에서 앱 생성)
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── manage.py
├── pyproject.toml        # ruff, mypy 설정
├── Dockerfile
└── .dockerignore
```

**requirements/base.txt**
```
Django==5.2.*
djangorestframework==3.15.*
djangorestframework-simplejwt==5.*
django-environ==0.11.*
psycopg[binary]==3.*
redis==5.*
celery[redis]==5.*
django-celery-beat==2.*
gunicorn==22.*
```

**requirements/dev.txt**
```
-r base.txt
pytest==8.*
pytest-django==4.*
pytest-asyncio==0.23.*
factory-boy==3.*
django-extensions==3.*
ipython==8.*
ruff==0.4.*
mypy==1.*
django-stubs==5.*
```

**config/settings/base.py** — environ 기반, INSTALLED_APPS, REST_FRAMEWORK, SIMPLE_JWT, CELERY 기본 설정 포함

**완료 기준**
- [ ] `python manage.py check --settings=config.settings.dev` 오류 없음

**커밋**
```
feat(backend): Django 5.2 설정 및 디렉터리 구조 생성
```

---

## 꼭지 2: Django Dockerfile & Compose 연동

**backend/Dockerfile** — Multi-stage (base / deps / development / production)

```dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

FROM base AS deps
COPY requirements/base.txt requirements/base.txt
RUN pip install --upgrade pip && pip install -r requirements/base.txt

FROM deps AS development
COPY requirements/dev.txt requirements/dev.txt
RUN pip install -r requirements/dev.txt
COPY . .
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

FROM deps AS production
COPY . .
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

`docker-compose.yml`에 backend 서비스 추가:
```yaml
backend:
  build:
    context: ./backend
    target: development
  container_name: orneo_backend
  restart: unless-stopped
  env_file: .env
  volumes:
    - ./backend:/app       # 개발 시 코드 마운트
  ports:
    - "8000:8000"
  networks:
    - orneo_net
  depends_on:
    db:
      condition: service_healthy
    redis:
      condition: service_healthy
  deploy:
    resources:
      limits:
        cpus: "1.00"
        memory: 1G
```

**완료 기준**
- [ ] `make dev-up` 후 `http://localhost:8000` 접속 성공
- [ ] `docker compose logs backend` 에서 개발 서버 기동 확인

**커밋**
```
chore(docker): Django backend 서비스 Compose 연동
```

---

## 꼭지 3: FastAPI AI 서비스 뼈대

```
ai_service/
├── main.py              # FastAPI app, lifespan, middleware
├── config.py            # pydantic-settings 기반 설정
├── routers/
│   ├── __init__.py
│   └── health.py        # GET /health → {"status": "ok", "version": "0.1.0"}
├── utils/
│   ├── __init__.py
│   └── http_client.py   # httpx AsyncClient 싱글턴
├── requirements.txt
├── Dockerfile
└── .dockerignore
```

**fastapi.md의 main.py, config.py 패턴 그대로 적용**

`docker-compose.yml`에 ai_service 추가:
```yaml
ai_service:
  build:
    context: ./ai_service
    target: development
  container_name: orneo_ai_service
  restart: unless-stopped
  env_file: .env
  volumes:
    - ./ai_service:/app
  ports:
    - "8001:8001"
  networks:
    - orneo_net
  depends_on:
    redis:
      condition: service_healthy
  deploy:
    resources:
      limits:
        cpus: "1.00"
        memory: 2G      # Gemma 모델 로딩 여유 확보
```

**완료 기준**
- [ ] `GET http://localhost:8001/health` → `{"status": "ok"}` 응답 확인
- [ ] `GET http://localhost:8001/docs` Swagger UI 확인 (개발 환경)
- [ ] Django → FastAPI `X-Service-Secret` 헤더 검증 미들웨어 동작 확인

**커밋**
```
feat(ai-service): FastAPI AI 서비스 뼈대 및 Compose 연동
```

---

## 세션 완료 후

```bash
git push origin feat/백엔드-뼈대
# PR: feat/백엔드-뼈대 → dev
# PR 제목: [feat] Django & FastAPI 백엔드 뼈대

# [마일스톤 M1] 인프라 완성 → dev → main PR
# Session 01 + Session 02 완료 기준으로:
# PR: dev → main (Merge Commit)
# git tag v0.1.0-infra

mv prompts/session_02_backend_skeleton.md prompts/_complete/
```

> **다음 세션**: session_03 에서 사용자 인증 & 목표 설정 앱을 구현한다.
