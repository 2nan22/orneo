# Session 01: Git 초기화 & Docker Compose 인프라

> **세션 목표**: 프로젝트 저장소와 Docker 기반 개발 인프라를 완성한다.
> **예상 소요**: 1~1.5시간
> **브랜치**: `chore/프로젝트-초기-설정` (dev에서 분기)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/docker.md
Read .claude/rules/git_workflow.md
Read .claude/rules/logging.md
```

---

## 꼭지 1: Git 초기화 및 브랜치 구조 설정

```bash
git init
git add .gitignore
git commit -m "chore: 프로젝트 초기 구조 생성"
git branch dev
git checkout dev
git checkout -b chore/프로젝트-초기-설정
```

**생성 파일: `.gitignore`**

```gitignore
# Python
__pycache__/
*.pyc
*.pyo
.venv/
*.egg-info/
dist/
build/
.pytest_cache/
.mypy_cache/
.ruff_cache/
htmlcov/

# Node
node_modules/
.next/
.expo/

# 환경 변수
.env
.env.*
!.env.example

# 로그
logs/
*.log
*.log.*

# macOS
.DS_Store

# IDE
.idea/
.vscode/
*.swp
```

**생성 파일: `.env.example`**

```bash
# Django
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_ENV=dev
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL)
POSTGRES_DB=orneo
POSTGRES_USER=orneo
POSTGRES_PASSWORD=
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# Social Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# AI Service
AI_SERVICE_URL=http://ai_service:8001
AI_SERVICE_SECRET=

# Ollama (Gemma)
OLLAMA_BASE_URL=http://host.docker.internal:11434
GEMMA_MODEL=gemma4:e2b

# Public Data APIs
MOLIT_API_KEY=
DART_API_KEY=
KMOOC_API_KEY=

# Anthropic (P1 이후 사용)
ANTHROPIC_API_KEY=
```

**완료 기준**
- [ ] `main`, `dev` 브랜치 존재 확인
- [ ] `git status`에서 `.env` 추적 안 됨 확인
- [ ] `.env.example`의 모든 키 존재 확인

**커밋**
```
chore(init): Git 초기화, .gitignore, .env.example 작성
```

---

## 꼭지 2: Docker Compose 공통 서비스 정의

`docker-compose.yml` 생성 — `docker.md`의 표준 구조를 그대로 적용.
우선 db, redis만 정의. backend/ai_service/frontend는 Dockerfile 완성 후 추가.

`docker-compose.dev.yml` 생성 — 개발 오버라이드.

**완료 기준**
- [ ] `./dc.sh dev up db redis` 성공
- [ ] `./dc.sh dev ps` 에서 db, redis 모두 `healthy` 상태
- [ ] `./dc.sh dev logs db` 에서 "ready to accept connections" 확인

**커밋**
```
chore(docker): Docker Compose db/redis 인프라 구성
```

---

## 꼭지 3: dc.sh 실행 권한 설정 및 검증

`dc.sh`는 이미 프로젝트 루트에 존재한다.
실행 권한을 부여하고 기본 동작을 검증한다.

```bash
chmod +x dc.sh
```

**검증 명령**

```bash
# 사용법 출력 확인
./dc.sh

# dev up 실행 (db, redis)
./dc.sh dev up

# 상태 확인
./dc.sh dev ps

# 로그 확인 (Ctrl+C로 종료)
./dc.sh dev logs db
```

**완료 기준**
- [ ] `./dc.sh` 실행 시 사용법 출력 확인
- [ ] `./dc.sh dev up` 성공
- [ ] `./dc.sh dev ps` 에서 healthy 상태 확인
- [ ] `./dc.sh dev logs db` 로그 스트리밍 확인

**커밋**
```
chore(dc.sh): 실행 권한 설정 및 dc.sh 동작 검증
```

---

## 세션 완료 후

```bash
git push origin chore/프로젝트-초기-설정
# PR: chore/프로젝트-초기-설정 → dev
# PR 제목: [chore] Git 초기화 & Docker Compose 인프라
mv prompts/session_01_git_docker.md prompts/_complete/
```

> **다음 세션**: session_02 에서 Django + FastAPI 백엔드 뼈대를 생성한다.
