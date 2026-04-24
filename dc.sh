#!/usr/bin/env bash
# dc.sh — ORNEO Docker Compose 관리 스크립트
# Usage: ./dc.sh [dev|prod] [command] [service?]
set -euo pipefail

# ─── Compose 파일 정의 ──────────────────────────────────────────────────────
COMPOSE_BASE="docker-compose.yml"
COMPOSE_DEV="docker-compose.dev.yml"
COMPOSE_PROD="docker-compose.prod.yml"

# ─── 사용법 ─────────────────────────────────────────────────────────────────
usage() {
    echo ""
    echo "Usage: ./dc.sh [stage] [command] [service?]"
    echo ""
    echo "  Stage:"
    echo "    dev   - 개발 환경 (docker-compose.yml + docker-compose.dev.yml)"
    echo "    prod  - 운영 환경 (docker-compose.yml + docker-compose.prod.yml)"
    echo ""
    echo "  Command (Docker):"
    echo "    build    - 이미지 빌드"
    echo "    up       - 컨테이너 시작 (백그라운드)"
    echo "    down     - 컨테이너 중단 및 제거"
    echo "    restart  - 컨테이너 재시작"
    echo "    ps       - 컨테이너 상태 조회"
    echo "    logs     - 로그 스트리밍 (Ctrl+C로 종료)"
    echo ""
    echo "  Command (Django — backend 컨테이너에서 실행):"
    echo "    migrate         - DB 마이그레이션 적용"
    echo "    makemigrations  - 마이그레이션 파일 생성"
    echo "    shell           - Django shell_plus 실행"
    echo "    createsuperuser - 관리자 계정 생성"
    echo "    test            - 전체 pytest 실행"
    echo "    lint            - Ruff + mypy 검사"
    echo "    format          - Ruff 자동 포맷"
    echo ""
    echo "  Service (생략 시 전체 서비스에 적용):"
    echo "    backend    - Django 메인 앱"
    echo "    ai         - FastAPI AI 서비스"
    echo "    frontend   - Next.js 프론트엔드"
    echo "    worker     - Celery Worker"
    echo "    beat       - Celery Beat (스케줄러)"
    echo "    db         - PostgreSQL"
    echo "    redis      - Redis"
    echo ""
    echo "  예시:"
    echo "    ./dc.sh dev build"
    echo "    ./dc.sh dev up"
    echo "    ./dc.sh dev up backend"
    echo "    ./dc.sh dev logs ai"
    echo "    ./dc.sh dev migrate"
    echo "    ./dc.sh dev test"
    echo "    ./dc.sh prod build backend"
    echo "    ./dc.sh prod up"
    echo ""
    exit 1
}

# ─── 인수 검증 ───────────────────────────────────────────────────────────────
[ $# -lt 2 ] && usage

STAGE="$1"
CMD="$2"
ALIAS="${3:-}"

# ─── Stage → Compose 파일 결정 ──────────────────────────────────────────────
case "$STAGE" in
    dev)  COMPOSE_ARGS="-f ${COMPOSE_BASE} -f ${COMPOSE_DEV}" ;;
    prod) COMPOSE_ARGS="-f ${COMPOSE_BASE} -f ${COMPOSE_PROD}" ;;
    *)
        echo "ERROR: stage는 'dev' 또는 'prod' 이어야 합니다. (입력값: '$STAGE')"
        usage
        ;;
esac

# ─── Service alias → 실제 서비스명 변환 ────────────────────────────────────
resolve_service() {
    local alias="$1"
    case "$alias" in
        backend)  echo "backend" ;;
        ai)       echo "ai_service" ;;
        frontend) echo "frontend" ;;
        worker)   echo "celery_worker" ;;
        beat)     echo "celery_beat" ;;
        db)       echo "db" ;;
        redis)    echo "redis" ;;
        "")       echo "" ;;
        *)
            echo "ERROR: 알 수 없는 서비스 '${alias}'" >&2
            echo "       사용 가능한 서비스: backend, ai, frontend, worker, beat, db, redis" >&2
            exit 1
            ;;
    esac
}

SERVICE=$(resolve_service "$ALIAS")

# ─── Django 관리 명령 (backend 컨테이너에서 실행) ───────────────────────────
run_django() {
    local django_cmd="$1"
    # backend 컨테이너가 실행 중인지 확인
    if ! docker compose ${COMPOSE_ARGS} ps backend | grep -q "running\|Up"; then
        echo "ERROR: backend 컨테이너가 실행 중이 아닙니다."
        echo "       먼저 './dc.sh ${STAGE} up' 을 실행하세요."
        exit 1
    fi
    docker compose ${COMPOSE_ARGS} exec backend ${django_cmd}
}

# ─── 명령 실행 ───────────────────────────────────────────────────────────────
case "$CMD" in
    # Docker 기본 명령
    build)
        echo ">>> [${STAGE}] 이미지 빌드: ${SERVICE:-전체 서비스}"
        docker compose ${COMPOSE_ARGS} build ${SERVICE}
        ;;
    up)
        echo ">>> [${STAGE}] 컨테이너 시작: ${SERVICE:-전체 서비스}"
        docker compose ${COMPOSE_ARGS} up -d ${SERVICE}
        ;;
    down)
        echo ">>> [${STAGE}] 컨테이너 중단: ${SERVICE:-전체 서비스}"
        docker compose ${COMPOSE_ARGS} down ${SERVICE}
        ;;
    restart)
        echo ">>> [${STAGE}] 컨테이너 재시작: ${SERVICE:-전체 서비스}"
        docker compose ${COMPOSE_ARGS} restart ${SERVICE}
        ;;
    ps)
        docker compose ${COMPOSE_ARGS} ps ${SERVICE}
        ;;
    logs)
        echo ">>> [${STAGE}] 로그 스트리밍: ${SERVICE:-전체 서비스} (Ctrl+C로 종료)"
        docker compose ${COMPOSE_ARGS} logs -f ${SERVICE}
        ;;

    # Django 관리 명령
    migrate)
        echo ">>> [${STAGE}] DB 마이그레이션 적용"
        run_django "python manage.py migrate"
        ;;
    makemigrations)
        APP="${SERVICE:-}"  # 앱명을 service 인수로 전달 가능
        echo ">>> [${STAGE}] 마이그레이션 파일 생성: ${APP:-전체}"
        run_django "python manage.py makemigrations ${APP}"
        ;;
    shell)
        echo ">>> [${STAGE}] Django shell_plus 실행"
        run_django "python manage.py shell_plus"
        ;;
    createsuperuser)
        echo ">>> [${STAGE}] 관리자 계정 생성"
        run_django "python manage.py createsuperuser"
        ;;
    test)
        echo ">>> [${STAGE}] 테스트 실행"
        run_django "pytest -v ${SERVICE:-}"
        ;;
    lint)
        echo ">>> [${STAGE}] Ruff + mypy 검사"
        run_django "bash -c 'ruff check . && mypy .'"
        ;;
    format)
        echo ">>> [${STAGE}] Ruff 자동 포맷"
        run_django "ruff format ."
        ;;

    *)
        echo "ERROR: 알 수 없는 명령 '${CMD}'"
        usage
        ;;
esac
