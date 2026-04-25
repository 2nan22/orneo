# Session 19: DecisionStudio — Gemma4 시나리오 생성 + UI

> **세션 목표**: ORNEO의 핵심 차별화 기능인 DecisionStudio를 구현한다. 의사결정 일지에서 A/B/C 시나리오를 Gemma4가 생성하고, 복기 모달 내에 시각적으로 표시한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: ai_service + Django 백엔드 + 프론트엔드 3계층, 컴포넌트 신설 집중
> **브랜치**: `feat/decision-studio` (dev에서 분기)
> **선행 세션**: Session 17 dev 병합 완료 필수 (journal.tasks.py 패턴 참고)

---

## 작업 전 주입 필수

```
Read .claude/CLAUDE.md
Read .claude/rules/project_conventions.md
Read .claude/rules/git_workflow.md
Read .claude/memory/feedback_git_workflow.md
Read .claude/rules/django.md
Read .claude/rules/clean_code.md
```

> ⚠️ Claude Agent SDK 사용 금지. 모든 AI 기능은 **Gemma4 (Ollama)** 만 사용.
> DecisionStudio 시뮬레이션 결과에 반드시 면책 고지를 포함한다.

---

## 꼭지 1: ai_service — `POST /decision/scenarios` 라우터 추가

> ⚠️ Claude Agent SDK 사용 금지. Gemma4 (Ollama) 만 사용.

### 1-1. 스키마 추가

**파일**: `ai_service/schemas/decision.py` (신규)

```python
# ai_service/schemas/decision.py
"""DecisionStudio 요청/응답 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class DecisionContext(BaseModel):
    """시나리오 생성을 위한 사용자 컨텍스트."""
    category: str = Field(..., description="결정 카테고리 (housing/investment/learning/routine)")
    user_goals: list[str] = Field(default_factory=list, description="관련 목표 제목 목록")
    recent_data: list[str] = Field(default_factory=list, description="관련 데이터 포인트 (예: 실거래가 변화)")


class DecisionScenariosRequest(BaseModel):
    """시나리오 생성 요청."""
    topic: str = Field(..., description="의사결정 주제 (예: 성동구 전세 vs 외곽 매수)")
    context: DecisionContext


class Scenario(BaseModel):
    """단일 시나리오."""
    id: str = Field(..., description="A / B / C")
    title: str = Field(..., description="시나리오 제목 (10자 이내)")
    risk: str = Field(..., description="높음 / 중간 / 낮음")
    description: str = Field(..., description="한 줄 설명 (40자 이내)")


class DecisionScenariosResponse(BaseModel):
    """시나리오 생성 응답."""
    topic: str
    evidence_chips: list[str] = Field(..., description="근거 데이터 칩 레이블 목록")
    scenarios: list[Scenario]
    model_used: str
    disclaimer: str = "이 시뮬레이션은 참고용이며 투자·부동산 권유가 아닙니다."
```

### 1-2. GemmaClient에 `generate_scenarios` 메서드 추가

**파일**: `ai_service/services/gemma_client.py`

```python
# fallback 상수
FALLBACK_SCENARIOS = [
    {"id": "A", "title": "현재 상태 유지", "risk": "낮음",  "description": "현재 상황을 유지하며 추가 데이터를 수집합니다."},
    {"id": "B", "title": "단계적 실행",    "risk": "중간",  "description": "작은 단계부터 시작해 리스크를 분산합니다."},
    {"id": "C", "title": "적극적 전환",    "risk": "높음",  "description": "목표 달성을 위해 빠르게 행동합니다."},
]
FALLBACK_EVIDENCE_CHIPS = ["목표 진척도", "리스크 수준", "실행 가능성"]

@dataclass
class ScenariosResult:
    """시나리오 생성 결과."""
    topic: str
    evidence_chips: list[str]
    scenarios: list[dict]
    model_used: str

async def generate_scenarios(
    self,
    topic: str,
    context: dict,
) -> ScenariosResult:
    """의사결정 주제에 대한 A/B/C 시나리오를 생성한다.

    Args:
        topic: 결정 주제 문자열.
        context: category, user_goals, recent_data 딕셔너리.

    Returns:
        ScenariosResult 시나리오 목록·근거칩·모델명.
    """
    prompt = self._build_scenarios_prompt(topic, context)
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
        scenarios, chips = self._parse_scenarios(raw_text, topic)
        return ScenariosResult(topic=topic, evidence_chips=chips, scenarios=scenarios, model_used=self._model)
    except (httpx.RequestError, httpx.HTTPStatusError) as exc:
        logger.warning("Gemma scenarios 호출 실패, fallback 반환: %s", exc)
        return ScenariosResult(
            topic=topic,
            evidence_chips=FALLBACK_EVIDENCE_CHIPS,
            scenarios=FALLBACK_SCENARIOS,
            model_used="fallback",
        )

def _build_scenarios_prompt(self, topic: str, context: dict) -> str:
    goals_str = "\n".join(f"- {g}" for g in context.get("user_goals", [])) or "없음"
    data_str  = "\n".join(f"- {d}" for d in context.get("recent_data", [])) or "없음"
    return f"""당신은 개인 재무·생활 코치입니다. 한국어로 답변하세요.

[주제] {topic}
[카테고리] {context.get("category", "general")}
[관련 목표]
{goals_str}
[참고 데이터]
{data_str}

위 주제에 대해 A·B·C 세 가지 선택지를 작성하세요.
각 선택지: 제목(10자 이내) / 리스크(높음·중간·낮음 중 하나) / 한 줄 설명(40자 이내)
마지막 줄에 근거 데이터 키워드 2~3개를 쉼표로 나열하세요.

형식 (반드시 이 형식 준수):
A: (제목) | 리스크: (높음/중간/낮음) | 설명: (한 줄 설명)
B: (제목) | 리스크: (높음/중간/낮음) | 설명: (한 줄 설명)
C: (제목) | 리스크: (높음/중간/낮음) | 설명: (한 줄 설명)
근거: (키워드1, 키워드2, 키워드3)"""

def _parse_scenarios(self, raw: str, topic: str) -> tuple[list[dict], list[str]]:
    lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
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
```

### 1-3. `decision` 라우터 신설 + `main.py` 등록

**파일**: `ai_service/routers/decision.py` (신규)

```python
# ai_service/routers/decision.py
"""DecisionStudio 시나리오 생성 라우터."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from schemas.decision import DecisionScenariosRequest, DecisionScenariosResponse, Scenario
from services.gemma_client import GemmaClient, get_gemma_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/scenarios",
    response_model=DecisionScenariosResponse,
    summary="A/B/C 의사결정 시나리오 생성",
)
async def generate_decision_scenarios(
    request: DecisionScenariosRequest,
    client: GemmaClient = Depends(get_gemma_client),
) -> DecisionScenariosResponse:
    """의사결정 주제와 컨텍스트를 받아 A/B/C 3가지 시나리오를 생성한다.

    Ollama 미응답 시 규칙 기반 fallback 반환 (503 아님).
    결과에는 반드시 면책 고지(disclaimer)가 포함된다.

    Args:
        request: 주제, 카테고리, 목표, 참고 데이터.
        client: Gemma 클라이언트 (DI).

    Returns:
        시나리오 3개, 근거 칩, 면책 고지.
    """
    try:
        result = await client.generate_scenarios(
            topic=request.topic,
            context=request.context.model_dump(),
        )
        return DecisionScenariosResponse(
            topic=result.topic,
            evidence_chips=result.evidence_chips,
            scenarios=[Scenario(**s) for s in result.scenarios],
            model_used=result.model_used,
        )
    except Exception as exc:
        logger.exception("scenarios 예기치 못한 오류: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시나리오 생성 서비스에서 오류가 발생했습니다.",
        ) from exc
    finally:
        await client.close()
```

**`ai_service/main.py`에 라우터 등록**

```python
from routers import coach, decision, health, public_data  # decision 추가

app.include_router(decision.router, prefix="/decision", tags=["decision"])  # 추가
```

**완료 기준**
- [ ] `curl -X POST http://localhost:8001/decision/scenarios -H "Content-Type: application/json" -d '{"topic":"전세 vs 매수","context":{"category":"housing","user_goals":[],"recent_data":[]}}' | jq .scenarios` — scenarios 3개 반환
- [ ] `scenarios[0].risk`가 "높음"/"중간"/"낮음" 중 하나
- [ ] `disclaimer` 필드에 "투자·부동산 권유가 아닙니다" 포함
- [ ] Ollama 중단 후 fallback 시나리오 반환 (503 아님)

**커밋**
```
feat(ai_service): /decision/scenarios 엔드포인트 추가 (Gemma4 + fallback)
```

---

## 꼭지 2: Django — `DecisionScenario` 모델 + Celery 태스크

### 2-1. 모델 추가

**파일**: `backend/apps/journal/models.py`에 추가

```python
class DecisionScenario(models.Model):
    """AI가 생성한 의사결정 시나리오.

    JournalEntry와 1:1 관계. 동일 일지에 대해 중복 생성 방지.

    Attributes:
        journal_entry: 연결된 일지.
        topic: 의사결정 주제.
        evidence_chips: 근거 데이터 칩 레이블 목록.
        scenarios: A/B/C 시나리오 목록 (JSON).
        model_used: 생성에 사용된 모델명.
        generated_at: 생성 시각.
    """

    journal_entry = models.OneToOneField(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name="decision_scenario",
    )
    topic = models.CharField(max_length=200)
    evidence_chips = models.JSONField(default=list)
    scenarios = models.JSONField(default=list)
    model_used = models.CharField(max_length=50, default="gemma4:e2b")
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "의사결정 시나리오"
        verbose_name_plural = "의사결정 시나리오 목록"

    def __str__(self) -> str:
        return f"[Scenario] journal_id={self.journal_entry_id}: {self.topic[:30]}"
```

**`backend/apps/journal/admin.py`에 등록**

```python
from apps.journal.models import DecisionScenario

@admin.register(DecisionScenario)
class DecisionScenarioAdmin(admin.ModelAdmin):
    list_display = ["id", "journal_entry", "topic", "model_used", "generated_at"]
    search_fields = ["topic", "journal_entry__title"]
    readonly_fields = ["evidence_chips", "scenarios", "model_used", "generated_at"]
```

**마이그레이션**

```bash
cd backend
python manage.py makemigrations journal --name="add_decision_scenario"
python manage.py migrate
```

### 2-2. Celery 태스크 추가

**파일**: `backend/apps/journal/tasks.py`에 추가

```python
@shared_task(bind=True, max_retries=2, default_retry_delay=15)
def generate_decision_scenarios(self, journal_id: int) -> None:
    """의사결정 일지에 대한 A/B/C 시나리오를 비동기 생성한다.

    investment 또는 housing 카테고리 일지에만 실행한다.
    이미 시나리오가 있는 경우 스킵한다.

    Args:
        journal_id: 시나리오를 생성할 JournalEntry PK.
    """
    import httpx
    from django.conf import settings

    from apps.journal.models import DecisionScenario, JournalEntry, JournalCategory

    logger.info("[TASK:%s] decision-scenarios 시작: journal_id=%d", self.request.id, journal_id)

    try:
        entry = JournalEntry.objects.get(pk=journal_id)
    except JournalEntry.DoesNotExist:
        logger.error("일지 없음: journal_id=%d", journal_id)
        return

    # investment·housing 외 카테고리는 스킵
    if entry.category not in (JournalCategory.INVESTMENT, JournalCategory.HOUSING):
        logger.info("시나리오 생략: category=%s journal_id=%d", entry.category, journal_id)
        return

    # 이미 시나리오 있으면 스킵
    if DecisionScenario.objects.filter(journal_entry=entry).exists():
        logger.info("시나리오 이미 존재: journal_id=%d", journal_id)
        return

    ai_service_url = getattr(settings, "AI_SERVICE_URL", "http://ai_service:8001")
    ai_service_secret = getattr(settings, "AI_SERVICE_SECRET", "")

    # 연결된 목표 제목 수집
    user_goals = list(
        entry.user.goals.filter(is_active=True)
        .filter(category=entry.category)
        .values_list("title", flat=True)[:3]
    )

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{ai_service_url}/decision/scenarios",
                json={
                    "topic": entry.title,
                    "context": {
                        "category": entry.category,
                        "user_goals": user_goals,
                        "recent_data": [],
                    },
                },
                headers={"X-Service-Secret": ai_service_secret},
            )
            response.raise_for_status()
            data = response.json()

        DecisionScenario.objects.create(
            journal_entry=entry,
            topic=data.get("topic", entry.title),
            evidence_chips=data.get("evidence_chips", []),
            scenarios=data.get("scenarios", []),
            model_used=data.get("model_used", "unknown"),
        )
        logger.info("[TASK:%s] decision-scenarios 완료: journal_id=%d", self.request.id, journal_id)

    except httpx.HTTPStatusError as exc:
        logger.warning("[TASK:%s] HTTP 오류 (시도 %d): %d", self.request.id, self.request.retries + 1, exc.response.status_code)
        raise self.retry(exc=exc, countdown=15 * (2 ** self.request.retries)) from exc
    except httpx.RequestError as exc:
        logger.warning("[TASK:%s] 연결 실패 (시도 %d): %s", self.request.id, self.request.retries + 1, exc)
        raise self.retry(exc=exc, countdown=15 * (2 ** self.request.retries)) from exc
```

### 2-3. 일지 저장 시 병렬 트리거

**파일**: `backend/apps/journal/services.py` (일지 생성 서비스 존재 가정)

```python
# 기존 generate_journal_summary.delay(entry.pk) 트리거 아래에 추가
from django.db import transaction

# 일지 생성 on_commit 콜백
def _on_journal_created(entry_pk: int) -> None:
    from apps.journal.tasks import generate_journal_summary, generate_decision_scenarios
    generate_journal_summary.delay(entry_pk)
    generate_decision_scenarios.delay(entry_pk)  # 병렬 실행

transaction.on_commit(lambda: _on_journal_created(entry.pk))
```

> **확인 필요**: 기존 일지 생성 서비스(`journal/services.py`)에서 `on_commit` 트리거 방식을 확인 후 `generate_decision_scenarios.delay` 호출을 추가한다. 기존 코드에 이미 `on_commit`이 있으면 그 안에 추가한다.

**완료 기준**
- [ ] `python manage.py migrate` 성공
- [ ] `generate_decision_scenarios.delay(<investment 일지 id>)` 수동 트리거 후 `DecisionScenario` DB 저장 확인
- [ ] `housing` 외 카테고리 일지에서 태스크 실행 시 스킵 로그 확인
- [ ] 이미 시나리오 있는 일지에서 중복 생성 없음 확인
- [ ] Django Admin `/admin/journal/decisionscenario/` 접근 확인

**커밋**
```
feat(backend): DecisionScenario 모델·마이그레이션·Celery 태스크 추가
```

---

## 꼭지 3: 프론트엔드 — `DecisionStudio.tsx` 컴포넌트 신설

**파일**: `frontend/src/components/journal/DecisionStudio.tsx` (신규)

리스크 수준별 스타일:

```typescript
const RISK_STYLES: Record<string, string> = {
  "높음": "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
  "중간": "bg-amber-50 text-amber-600",
  "낮음": "bg-[var(--color-point-light)] text-[var(--color-point)]",
};
```

컴포넌트 구조:

```tsx
// frontend/src/components/journal/DecisionStudio.tsx
"use client";

interface Scenario { id: string; title: string; risk: string; description: string; }
interface Props {
  topic: string;
  evidenceChips: string[];
  scenarios: Scenario[];
  disclaimer: string;
  isLoading?: boolean;
}

export default function DecisionStudio({ topic, evidenceChips, scenarios, disclaimer, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card padding="md" className="animate-pulse">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-point)]">
          Decision Studio
        </p>
        <div className="h-4 w-40 rounded bg-[var(--color-border)] mb-4" />
        {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--color-border)] mb-2" />)}
      </Card>
    );
  }

  return (
    <Card padding="md">
      {/* eyebrow */}
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-point)]">
        Decision Studio
      </p>

      {/* 주제 */}
      <p className="mb-3 text-sm font-bold text-[var(--color-text)]">{topic}</p>

      {/* 근거 데이터 칩 */}
      {evidenceChips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {evidenceChips.map((chip, i) => (
            <span key={i} className="rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-[10px]
                                     font-medium text-[var(--color-text-sub)]">
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* A/B/C 시나리오 카드 */}
      <div className="flex flex-col gap-2">
        {scenarios.map((s) => (
          <div key={s.id}
               className="rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                <span className="mr-2 text-[var(--color-text-sub)]">{s.id}.</span>
                {s.title}
              </p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_STYLES[s.risk] ?? RISK_STYLES["중간"]}`}>
                {s.risk}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-sub)]">{s.description}</p>
          </div>
        ))}
      </div>

      {/* 면책 고지 — 필수 */}
      <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">{disclaimer}</p>
    </Card>
  );
}
```

**완료 기준**
- [ ] A/B/C 시나리오 카드 렌더링 확인 (리스크 배지 색상: 높음=빨강, 중간=주황, 낮음=청록)
- [ ] `isLoading=true` 시 skeleton 표시 확인
- [ ] `disclaimer` 텍스트 하단 표시 확인
- [ ] `npx tsc --noEmit` 타입 에러 없음

**커밋**
```
feat(frontend): DecisionStudio 컴포넌트 신설 (A/B/C 시나리오 + 면책 고지)
```

---

## 꼭지 4: `ReviewModal`에 DecisionStudio 통합

**파일**: `frontend/src/components/journal/ReviewModal.tsx`

> **현재 구조 확인 필요**: `ReviewModal`의 props, 레이아웃 구조를 먼저 확인하고 아래 패턴을 적용한다.

### 4-1. 타입 업데이트

**파일**: `frontend/src/lib/types.ts`

```typescript
export type DecisionScenarioData = {
  topic: string;
  evidence_chips: string[];
  scenarios: Array<{ id: string; title: string; risk: string; description: string }>;
  disclaimer: string;
};

export type JournalEntry = {
  // ... 기존 필드 유지 ...
  decision_scenario?: DecisionScenarioData | null;  // 신규
};
```

### 4-2. ReviewModal 수정

`category`가 `investment` 또는 `housing`인 경우에만 DecisionStudio 표시.

```tsx
// ReviewModal.tsx 내 추가
import DecisionStudio from "./DecisionStudio";

// 모달 내 기존 AI 요약 아래에 추가:
{(entry.category === "investment" || entry.category === "housing") && (
  <div className="mt-4">
    {entry.decision_scenario ? (
      <DecisionStudio
        topic={entry.decision_scenario.topic}
        evidenceChips={entry.decision_scenario.evidence_chips}
        scenarios={entry.decision_scenario.scenarios}
        disclaimer={entry.decision_scenario.disclaimer}
      />
    ) : (
      // 시나리오 미생성 상태 — "AI 분석 요청" 버튼
      <DecisionStudio
        topic={entry.title}
        evidenceChips={[]}
        scenarios={[]}
        disclaimer=""
        isLoading={scenarioLoading}
      />
    )}
  </div>
)}
```

### 4-3. 백엔드 Journal Serializer에 `decision_scenario` 필드 추가

**파일 확인**: `backend/apps/journal/serializers.py` — `JournalEntrySerializer`에 추가 필요.

```python
# 시나리오가 있으면 포함, 없으면 null 반환
class DecisionScenarioInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionScenario
        fields = ["topic", "evidence_chips", "scenarios", "model_used"]

class JournalEntrySerializer(serializers.ModelSerializer):
    decision_scenario = DecisionScenarioInlineSerializer(read_only=True, allow_null=True)
    # ... 기존 필드 ...
```

**완료 기준**
- [ ] `investment` 카테고리 일지 복기 모달에 DecisionStudio 카드 표시
- [ ] 시나리오 생성 전 상태에서 `isLoading` skeleton 표시 (또는 빈 상태)
- [ ] `GET /api/v1/journals/` 응답에 `decision_scenario` 필드 포함
- [ ] `housing` 외 카테고리 일지 모달에 DecisionStudio 미표시 확인
- [ ] `npm run build` + `npx tsc --noEmit` 통과

**커밋**
```
feat(frontend): ReviewModal에 DecisionStudio 통합 + Journal serializer 업데이트
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin feat/decision-studio

gh pr create \
  --base dev \
  --title "[feat] DecisionStudio — Gemma4 A/B/C 시나리오 생성 + UI" \
  --body "$(cat <<'EOF'
## 개요
의사결정 일지에서 Gemma4가 A/B/C 시나리오를 생성하고 복기 모달에 표시한다.

## 변경 사항
- [ ] ai_service: POST /decision/scenarios 라우터 + 스키마 추가
- [ ] ai_service: GemmaClient.generate_scenarios() + fallback
- [ ] ai_service: main.py decision 라우터 등록
- [ ] backend: DecisionScenario 모델 + 마이그레이션
- [ ] backend: generate_decision_scenarios Celery 태스크 (investment·housing 한정)
- [ ] backend: 일지 생성 on_commit에 시나리오 태스크 병렬 추가
- [ ] backend: JournalEntrySerializer에 decision_scenario 필드 추가
- [ ] frontend: DecisionStudio 컴포넌트 신설 (skeleton·시나리오·면책 고지)
- [ ] frontend: ReviewModal DecisionStudio 통합
- [ ] frontend: JournalEntry 타입에 decision_scenario 추가

## 테스트
- [ ] curl /decision/scenarios → scenarios 3개 반환
- [ ] Ollama 중단 시 fallback 시나리오 반환
- [ ] investment 일지 저장 후 5초 내 DecisionScenario DB 생성 확인
- [ ] 복기 모달에서 A/B/C 시나리오 + 면책 고지 표시 확인
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] Google Style Docstring 작성
- [ ] Type Hinting 적용
- [ ] logging 모듈 사용 (print 없음)
- [ ] 환경변수 하드코딩 없음
- [ ] Claude Agent SDK 미사용 — Gemma4 (Ollama) 전용
- [ ] disclaimer 필드 포함: "이 시뮬레이션은 참고용이며 투자·부동산 권유가 아닙니다."
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/decision-studio" \
  --body "$(cat <<'EOF'
[feat] DecisionStudio — Gemma4 A/B/C 시나리오 생성 + UI

- POST /decision/scenarios (Gemma4 + fallback)
- DecisionScenario 모델 + 일지 생성 시 병렬 태스크
- DecisionStudio.tsx (skeleton·시나리오 카드·면책 고지)
- ReviewModal DecisionStudio 통합 (investment·housing 한정)
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/decision-studio

mv prompts/session_19_decision_studio.md prompts/_complete/
```
