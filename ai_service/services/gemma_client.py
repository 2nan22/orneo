# ai_service/services/gemma_client.py
"""Gemma 로컬 코치 클라이언트 (Ollama 기반)."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from config import settings

logger = logging.getLogger(__name__)

OLLAMA_GENERATE_URL = "/api/generate"

FALLBACK_SUMMARY = "오늘 일지를 잘 작성하셨습니다. 꾸준한 기록이 쌓여 의사결정을 더 명확하게 만들어 줍니다."
FALLBACK_ACTIONS: list[str] = [
    "목표 진척도 점검하기",
    "실거래가 변화 확인하기",
    "K-MOOC 강좌 20분 학습하기",
]


@dataclass
class CoachResult:
    """코치 응답 결과."""

    summary: str
    actions: list[str]
    model_used: str


class GemmaClient:
    """Gemma 온디바이스 코치 클라이언트.

    Ollama REST API를 통해 로컬 Gemma 모델을 호출한다.
    Ollama가 응답하지 않으면 규칙 기반 fallback을 반환하므로
    서비스가 중단되지 않는다.
    """

    def __init__(self, base_url: str, model: str) -> None:
        """클라이언트 초기화.

        Args:
            base_url: Ollama 서버 URL.
            model: 사용할 모델명 (예: 'gemma4:e2b').
        """
        self._base_url = base_url
        self._model = model
        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=httpx.Timeout(30.0, connect=5.0),
        )

    async def summarize(self, journal_text: str, context: dict) -> CoachResult:
        """일지를 요약하고 오늘의 행동을 제안한다.

        Args:
            journal_text: 사용자가 작성한 일지 본문.
            context: 사용자 목표·상태 컨텍스트 딕셔너리.

        Returns:
            요약과 추천 행동을 담은 CoachResult.
        """
        prompt = self._build_summarize_prompt(journal_text, context)

        try:
            response = await self._client.post(
                OLLAMA_GENERATE_URL,
                json={
                    "model": self._model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.3, "num_predict": 300},
                },
            )
            response.raise_for_status()
            raw_text = response.json().get("response", "")
            summary, actions = self._parse_response(raw_text)
            logger.info("Gemma 요약 완료: model=%s", self._model)
            return CoachResult(summary=summary, actions=actions, model_used=self._model)

        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            logger.warning("Gemma 호출 실패, fallback 반환: %s", exc)
            return CoachResult(
                summary=FALLBACK_SUMMARY,
                actions=FALLBACK_ACTIONS,
                model_used="fallback",
            )

    def _build_summarize_prompt(self, journal_text: str, context: dict) -> str:
        """요약 프롬프트를 구성한다.

        Args:
            journal_text: 일지 본문.
            context: 컨텍스트 딕셔너리.

        Returns:
            완성된 프롬프트 문자열.
        """
        context_str = "\n".join(f"- {k}: {v}" for k, v in context.items())
        return f"""당신은 개인 라이프 코치입니다. 아래 일지를 읽고 한국어로 답변하세요.

[사용자 컨텍스트]
{context_str}

[일지 내용]
{journal_text}

다음 형식으로 응답하세요:

요약: (2~3문장으로 핵심 요약)
행동1: (오늘 취할 수 있는 구체적 행동)
행동2: (오늘 취할 수 있는 구체적 행동)
행동3: (오늘 취할 수 있는 구체적 행동)"""

    def _parse_response(self, raw: str) -> tuple[str, list[str]]:
        """Gemma 응답을 요약과 행동 목록으로 파싱한다.

        Args:
            raw: Gemma 원본 응답 텍스트.

        Returns:
            (summary, actions) 튜플.
        """
        lines = [line.strip() for line in raw.strip().splitlines() if line.strip()]
        summary = ""
        actions: list[str] = []

        for line in lines:
            if line.startswith("요약:"):
                summary = line.removeprefix("요약:").strip()
            elif line.startswith("행동") and ":" in line:
                action = line.split(":", 1)[1].strip()
                if action:
                    actions.append(action)

        if not summary:
            summary = FALLBACK_SUMMARY
        if not actions:
            actions = FALLBACK_ACTIONS[:3]

        return summary, actions[:3]

    async def close(self) -> None:
        """HTTP 클라이언트 정리."""
        await self._client.aclose()


def get_gemma_client() -> GemmaClient:
    """FastAPI DI용 GemmaClient 팩토리."""
    return GemmaClient(
        base_url=settings.ollama_base_url,
        model=settings.gemma_model,
    )
