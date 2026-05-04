# ai_service/main.py
"""FastAPI 애플리케이션 진입점."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import coach, decision, health, news, public_data
from utils.http_client import close_http_client, init_http_client

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(levelname)s %(asctime)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """애플리케이션 생명주기 관리."""
    logger.info("AI Service starting up...")
    await init_http_client()
    yield
    logger.info("AI Service shutting down...")
    await close_http_client()


app = FastAPI(
    title="ORNEO AI Service",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_service_secret(request: Request, call_next):
    """내부 서비스 간 통신에서 X-Service-Secret 헤더를 검증한다.

    /health 엔드포인트는 검증을 건너뛴다.
    """
    _open_paths = {"/health", "/docs", "/openapi.json", "/redoc"}
    if request.url.path in _open_paths:
        return await call_next(request)

    if settings.ai_service_secret:
        secret = request.headers.get("X-Service-Secret", "")
        if secret != settings.ai_service_secret:
            logger.warning(
                "Unauthorized request to %s from %s",
                request.url.path,
                request.client.host if request.client else "unknown",
            )
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"status": "error", "code": "UNAUTHORIZED", "message": "인증 실패"},
            )

    return await call_next(request)


app.include_router(health.router, tags=["health"])
app.include_router(coach.router, prefix="/coach", tags=["coach"])
app.include_router(decision.router, prefix="/decision", tags=["decision"])
app.include_router(public_data.router, prefix="/public-data", tags=["public-data"])
app.include_router(news.router)
