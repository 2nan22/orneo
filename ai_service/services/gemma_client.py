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

FALLBACK_SCENARIOS: list[dict] = [
    {"id": "A", "title": "현재 상태 유지", "risk": "낮음",  "description": "현재 상황을 유지하며 추가 데이터를 수집합니다."},
    {"id": "B", "title": "단계적 실행",    "risk": "중간",  "description": "작은 단계부터 시작해 리스크를 분산합니다."},
    {"id": "C", "title": "적극적 전환",    "risk": "높음",  "description": "목표 달성을 위해 빠르게 행동합니다."},
]
FALLBACK_EVIDENCE_CHIPS: list[str] = ["목표 진척도", "리스크 수준", "실행 가능성"]

FALLBACK_ACTIONS_ITEMS: list[dict] = [
    {"text": "목표 진척도 5분 점검", "category": "general"},
    {"text": "오늘 지출 1건 기록", "category": "financial"},
    {"text": "K-MOOC 20분 학습", "category": "learning"},
]
FALLBACK_KEY_QUESTION = "오늘 내 행동이 중장기 목표에 얼마나 기여하나요?"


@dataclass
class CoachResult:
    """코치 응답 결과."""

    summary: str
    actions: list[str]
    model_used: str


@dataclass
class ScenariosResult:
    """시나리오 생성 결과."""

    topic: str
    evidence_chips: list[str]
    scenarios: list[dict]
    model_used: str


@dataclass
class DailyActionsResult:
    """일일 행동 생성 결과."""

    actions: list[dict]
    key_question: str
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

    async def generate_daily_actions(
        self,
        goals: list[dict],
        recent_summaries: list[str],
        risk_tolerance: str,
    ) -> DailyActionsResult:
        """목표와 최근 일지를 바탕으로 오늘 할 행동 3개와 핵심 질문을 생성한다.

        Args:
            goals: 활성 목표 목록 (category, title, progress).
            recent_summaries: 최근 3일 일지 요약 목록.
            risk_tolerance: 사용자 투자 성향.

        Returns:
            DailyActionsResult 행동·질문·모델명.
        """
        prompt = self._build_daily_actions_prompt(goals, recent_summaries, risk_tolerance)
        try:
            response = await self._client.post(
                OLLAMA_GENERATE_URL,
                json={
                    "model": self._model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.4, "num_predict": 400},
                },
            )
            response.raise_for_status()
            raw_text = response.json().get("response", "")
            actions, key_question = self._parse_daily_actions(raw_text)
            return DailyActionsResult(actions=actions, key_question=key_question, model_used=self._model)
        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            logger.warning("Gemma daily-actions 호출 실패, fallback 반환: %s", exc)
            return DailyActionsResult(
                actions=FALLBACK_ACTIONS_ITEMS,
                key_question=FALLBACK_KEY_QUESTION,
                model_used="fallback",
            )

    def _build_daily_actions_prompt(
        self,
        goals: list[dict],
        summaries: list[str],
        risk: str,
    ) -> str:
        """일일 행동 생성 프롬프트를 구성한다.

        Args:
            goals: 활성 목표 목록.
            summaries: 최근 일지 요약 목록.
            risk: 투자 성향.

        Returns:
            완성된 프롬프트 문자열.
        """
        goals_str = "\n".join(
            f"- [{g['category']}] {g['title']} (진척도: {int(g['progress'] * 100)}%)"
            for g in goals
        ) or "활성 목표 없음"
        summaries_str = "\n".join(f"- {s}" for s in summaries) or "최근 일지 없음"
        return f"""당신은 개인 라이프 코치입니다. 한국어로 답변하세요.

[사용자 목표]
{goals_str}

[최근 일지 요약]
{summaries_str}

[투자 성향] {risk}

위 정보를 바탕으로 오늘 취할 구체적 행동 3개와 핵심 질문 1개를 생성하세요.
각 행동은 30자 이내, 오늘 당장 실행 가능한 것으로 작성하세요.

형식:
행동1: (행동 설명) | 카테고리: (financial/housing/learning/routine/general 중 하나)
행동2: (행동 설명) | 카테고리: (카테고리)
행동3: (행동 설명) | 카테고리: (카테고리)
핵심질문: (오늘 스스로에게 던질 핵심 질문)"""

    def _parse_daily_actions(self, raw: str) -> tuple[list[dict], str]:
        """Gemma 응답에서 행동 목록과 핵심 질문을 파싱한다.

        Args:
            raw: Gemma 원본 응답 텍스트.

        Returns:
            (actions, key_question) 튜플.
        """
        lines = [line.strip() for line in raw.strip().splitlines() if line.strip()]
        actions: list[dict] = []
        key_question = FALLBACK_KEY_QUESTION

        for line in lines:
            if line.startswith("행동") and "|" in line:
                parts = line.split("|", 1)
                text = parts[0].split(":", 1)[1].strip() if ":" in parts[0] else parts[0].strip()
                category = "general"
                if len(parts) > 1 and "카테고리:" in parts[1]:
                    category = parts[1].split("카테고리:", 1)[1].strip().lower()
                actions.append({"text": text, "category": category})
            elif line.startswith("핵심질문:"):
                key_question = line.removeprefix("핵심질문:").strip()

        if len(actions) < 3:
            actions = FALLBACK_ACTIONS_ITEMS

        return actions[:3], key_question

    async def generate_scenarios(
        self,
        topic: str,
        context: dict,
        *,
        tavily_api_key: str = "",
    ) -> ScenariosResult:
        """의사결정 주제에 대한 A/B/C 시나리오를 생성한다.

        Args:
            topic: 결정 주제 문자열.
            context: category, user_goals, recent_data 딕셔너리.
            tavily_api_key: Tavily API 키. 빈 값이면 검색 생략.

        Returns:
            ScenariosResult 시나리오 목록·근거칩·모델명.
        """
        from services.search import search_recent_news
        query = self._build_search_query(topic, context.get("category", ""))
        search_snippets = await search_recent_news(query, api_key=tavily_api_key)

        prompt = self._build_scenarios_prompt(topic, context, search_snippets)
        try:
            response = await self._client.post(
                OLLAMA_GENERATE_URL,
                json={
                    "model": self._model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.5, "num_predict": 500},
                },
            )
            response.raise_for_status()
            raw_text = response.json().get("response", "")
            scenarios, chips = self._parse_scenarios(raw_text)
            return ScenariosResult(topic=topic, evidence_chips=chips, scenarios=scenarios, model_used=self._model)
        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            logger.warning("Gemma scenarios 호출 실패, fallback 반환: %s", exc)
            return ScenariosResult(
                topic=topic,
                evidence_chips=FALLBACK_EVIDENCE_CHIPS,
                scenarios=FALLBACK_SCENARIOS,
                model_used="fallback",
            )

    CATEGORY_SEARCH_SUFFIX: dict[str, str] = {
        "investment": "주가 최근 뉴스 실적",
        "housing": "부동산 시세 최근 뉴스",
        "learning": "강좌 추천 커리어",
        "routine": "루틴 생산성",
        "general": "최신 트렌드",
    }

    def _build_search_query(self, topic: str, category: str) -> str:
        """카테고리별 검색 접미어를 붙여 검색 쿼리를 반환한다.

        Args:
            topic: 결정 주제.
            category: 일지 카테고리.

        Returns:
            완성된 검색 쿼리 문자열.
        """
        suffix = self.CATEGORY_SEARCH_SUFFIX.get(category, "")
        return f"{topic} {suffix}".strip()

    def _build_scenarios_prompt(
        self,
        topic: str,
        context: dict,
        search_snippets: list[str] | None = None,
    ) -> str:
        """시나리오 생성 프롬프트를 구성한다.

        Args:
            topic: 결정 주제.
            context: 컨텍스트 딕셔너리.
            search_snippets: Tavily 검색 결과 요약 목록.

        Returns:
            완성된 프롬프트 문자열.
        """
        goals_str = "\n".join(f"- {g}" for g in context.get("user_goals", [])) or "없음"
        data_str = "\n".join(f"- {d}" for d in context.get("recent_data", [])) or "없음"
        snippets_str = (
            "\n".join(f"- {s}" for s in search_snippets)
            if search_snippets
            else "검색 결과 없음"
        )
        return f"""당신은 개인 재무·생활 코치입니다. 한국어로 답변하세요.

[주제] {topic}
[카테고리] {context.get("category", "general")}
[관련 목표]
{goals_str}
[참고 데이터]
{data_str}
[최신 참고 정보 (웹 검색)]
{snippets_str}

위 주제에 대해 A·B·C 세 가지 선택지를 작성하세요.
각 선택지: 제목(10자 이내) / 리스크(높음·중간·낮음 중 하나) / 한 줄 설명(40자 이내)
마지막 줄에 근거 데이터 키워드 2~3개를 쉼표로 나열하세요.

형식 (반드시 이 형식 준수):
A: (제목) | 리스크: (높음/중간/낮음) | 설명: (한 줄 설명)
B: (제목) | 리스크: (높음/중간/낮음) | 설명: (한 줄 설명)
C: (제목) | 리스크: (높음/중간/낮음) | 설명: (한 줄 설명)
근거: (키워드1, 키워드2, 키워드3)"""

    def _parse_scenarios(self, raw: str) -> tuple[list[dict], list[str]]:
        """Gemma 응답에서 시나리오 목록과 근거 칩을 파싱한다.

        Args:
            raw: Gemma 원본 응답 텍스트.

        Returns:
            (scenarios, chips) 튜플.
        """
        lines = [line.strip() for line in raw.strip().splitlines() if line.strip()]
        scenarios: list[dict] = []
        chips: list[str] = FALLBACK_EVIDENCE_CHIPS[:]

        for line in lines:
            for sid in ["A", "B", "C"]:
                if line.startswith(f"{sid}:") and "|" in line:
                    parts = [p.strip() for p in line.split("|")]
                    title = parts[0].replace(f"{sid}:", "").strip()
                    risk = "중간"
                    desc = ""
                    for p in parts[1:]:
                        if p.startswith("리스크:"):
                            risk = p.replace("리스크:", "").strip()
                        elif p.startswith("설명:"):
                            desc = p.replace("설명:", "").strip()
                    scenarios.append({"id": sid, "title": title, "risk": risk, "description": desc})
            if line.startswith("근거:"):
                chips = [c.strip() for c in line.replace("근거:", "").split(",") if c.strip()]

        if len(scenarios) < 3:
            scenarios = FALLBACK_SCENARIOS
        return scenarios[:3], chips[:4]

    async def close(self) -> None:
        """HTTP 클라이언트 정리."""
        await self._client.aclose()


def get_gemma_client() -> GemmaClient:
    """FastAPI DI용 GemmaClient 팩토리."""
    return GemmaClient(
        base_url=settings.ollama_base_url,
        model=settings.gemma_model,
    )
