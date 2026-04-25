# Session 17: 대시보드 AI 연결 — Gemma4 일일 행동·핵심 질문 생성

> **세션 목표**: 대시보드의 빈 `today_actions`와 `key_question`을 Gemma4(Ollama)로 채운다. 매일 오전 6시 Celery beat가 사용자별 행동 3개 + 핵심 질문 1개를 생성하고 DB에 저장한다.
> **예상 소요**: 2~2.5시간
> **작업량 기준**: ai_service + Django 백엔드 + 프론트엔드 3계층 모두 수정
> **브랜치**: `feat/dashboard-ai-daily-actions` (dev에서 분기)
> **선행 세션**: Session 11~16 dev 병합 완료 필수
> **참고**: 현재 `DashboardView` 응답 구조(`capital_score` + nested `breakdown`)와 프론트 `DashboardData` 타입(`score` + flat)이 불일치함 — 이 세션에서 함께 수정

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

---

## 꼭지 1: ai_service — `POST /coach/daily-actions` 라우터 추가

> ⚠️ Claude Agent SDK 사용 금지. Gemma4 (Ollama) 만 사용.

### 1-1. 스키마 추가

**파일**: `ai_service/schemas/coach.py`에 아래 클래스 추가

```python
class GoalSummary(BaseModel):
    """목표 요약 (daily-actions 입력용)."""
    category: str = Field(..., description="목표 카테고리 (financial/housing/learning/routine)")
    title: str = Field(..., description="목표 제목")
    progress: float = Field(..., ge=0.0, le=1.0, description="진척도 0.0~1.0")


class DailyActionsRequest(BaseModel):
    """일일 행동 생성 요청."""
    goals: list[GoalSummary] = Field(default_factory=list, description="활성 목표 목록")
    recent_journal_summaries: list[str] = Field(
        default_factory=list, max_length=3,
        description="최근 3일 일지 요약 (ai_summary 필드)"
    )
    risk_tolerance: str = Field(default="moderate", description="투자 성향")


class ActionItem(BaseModel):
    """오늘 할 행동 한 개."""
    text: str = Field(..., description="행동 설명 (30자 이내 권장)")
    category: str = Field(..., description="카테고리 (financial/housing/learning/routine/general)")


class DailyActionsResponse(BaseModel):
    """일일 행동 생성 응답."""
    actions: list[ActionItem] = Field(..., description="오늘 할 행동 3개")
    key_question: str = Field(..., description="오늘의 핵심 질문 1개")
    model_used: str = Field(..., description="사용된 모델명 또는 'fallback'")
```

### 1-2. GemmaClient에 메서드 추가

**파일**: `ai_service/services/gemma_client.py`

```python
# fallback 상수 추가
FALLBACK_ACTIONS_ITEMS = [
    {"text": "목표 진척도 5분 점검", "category": "general"},
    {"text": "오늘 지출 1건 기록", "category": "financial"},
    {"text": "K-MOOC 20분 학습", "category": "learning"},
]
FALLBACK_KEY_QUESTION = "오늘 내 행동이 중장기 목표에 얼마나 기여하나요?"

# dataclass 추가
@dataclass
class DailyActionsResult:
    """일일 행동 생성 결과."""
    actions: list[dict]   # {"text": str, "category": str}
    key_question: str
    model_used: str

# GemmaClient 메서드 추가
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

def _build_daily_actions_prompt(self, goals: list[dict], summaries: list[str], risk: str) -> str:
    goals_str = "\n".join(
        f"- [{g['category']}] {g['title']} (진척도: {int(g['progress']*100)}%)"
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
    lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
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
```

### 1-3. 라우터 추가

**파일**: `ai_service/routers/coach.py`에 추가

```python
from schemas.coach import DailyActionsRequest, DailyActionsResponse, ActionItem

@router.post(
    "/daily-actions",
    response_model=DailyActionsResponse,
    summary="오늘의 행동 3개 + 핵심 질문 생성",
)
async def generate_daily_actions(
    request: DailyActionsRequest,
    client: GemmaClient = Depends(get_gemma_client),
) -> DailyActionsResponse:
    """사용자의 목표·일지 맥락을 바탕으로 오늘 할 행동 3개와 핵심 질문을 생성한다.

    Ollama 미응답 시 규칙 기반 fallback을 반환 (503 아님).

    Args:
        request: 목표 목록, 최근 일지 요약, 투자 성향.
        client: Gemma 클라이언트 (DI).

    Returns:
        행동 3개, 핵심 질문, 사용 모델명.
    """
    try:
        result = await client.generate_daily_actions(
            goals=[g.model_dump() for g in request.goals],
            recent_summaries=request.recent_journal_summaries,
            risk_tolerance=request.risk_tolerance,
        )
        return DailyActionsResponse(
            actions=[ActionItem(**a) for a in result.actions],
            key_question=result.key_question,
            model_used=result.model_used,
        )
    except Exception as exc:
        logger.exception("daily-actions 예기치 못한 오류: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="행동 생성 서비스에서 오류가 발생했습니다.",
        ) from exc
    finally:
        await client.close()
```

**완료 기준**
- [ ] `curl -X POST http://localhost:8001/coach/daily-actions -H "Content-Type: application/json" -d '{"goals":[],"recent_journal_summaries":[]}' | jq .actions` — actions 3개 반환 확인
- [ ] Ollama 중단 후 동일 호출 → fallback 응답 반환 (503 아님) 확인
- [ ] `key_question` 비어있지 않음 확인
- [ ] ai_service 로그에 `WARNING Gemma daily-actions 호출 실패, fallback 반환` 출력 확인

**커밋**
```
feat(ai_service): /coach/daily-actions 엔드포인트 추가 (Gemma4 + fallback)
```

---

## 꼭지 2: Django — `TodayAction` · `DailyKeyQuestion` 모델 추가

**파일**: `backend/apps/dashboard/models.py`에 추가

```python
class TodayAction(models.Model):
    """사용자의 오늘 할 행동.

    Attributes:
        user: 행동 소유자.
        text: 행동 설명.
        category: 행동 카테고리.
        completed: 완료 여부.
        action_date: 행동 대상 날짜.
        created_at: 생성 시각.
    """

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="today_actions",
    )
    text = models.CharField(max_length=200)
    category = models.CharField(
        max_length=20,
        default="general",
        help_text="financial/housing/learning/routine/general",
    )
    completed = models.BooleanField(default=False)
    action_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "오늘의 행동"
        verbose_name_plural = "오늘의 행동 목록"

    def __str__(self) -> str:
        return f"[{self.action_date}] {self.text[:30]} (user_id={self.user_id})"


class DailyKeyQuestion(models.Model):
    """오늘의 핵심 질문.

    Attributes:
        user: 질문 소유자.
        question: 핵심 질문 텍스트.
        question_date: 질문 대상 날짜.
        created_at: 생성 시각.
    """

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.CASCADE,
        related_name="daily_questions",
    )
    question = models.TextField()
    question_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-question_date"]
        unique_together = [("user", "question_date")]
        verbose_name = "오늘의 핵심 질문"
        verbose_name_plural = "오늘의 핵심 질문 목록"

    def __str__(self) -> str:
        return f"[{self.question_date}] user_id={self.user_id}"
```

**`backend/apps/dashboard/admin.py`에 추가**

```python
from apps.dashboard.models import DailyKeyQuestion, TodayAction

@admin.register(TodayAction)
class TodayActionAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "text", "category", "completed", "action_date"]
    list_filter = ["action_date", "category", "completed"]
    search_fields = ["user__email", "text"]

@admin.register(DailyKeyQuestion)
class DailyKeyQuestionAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "question_date", "question"]
    list_filter = ["question_date"]
    search_fields = ["user__email"]
```

**마이그레이션**

```bash
cd backend
python manage.py makemigrations dashboard --name="add_today_action_daily_key_question"
python manage.py migrate
```

**완료 기준**
- [ ] `python manage.py migrate` 성공
- [ ] Django Admin `/admin/dashboard/todayaction/` 접근 가능
- [ ] Django Admin `/admin/dashboard/dailykeyquestion/` 접근 가능

**커밋**
```
feat(backend): TodayAction·DailyKeyQuestion 모델 추가 및 마이그레이션
```

---

## 꼭지 3: Django — Celery 태스크 + Beat 스케줄 추가

**파일**: `backend/apps/dashboard/tasks.py` (신규 생성)

```python
# backend/apps/dashboard/tasks.py
"""대시보드 Celery 태스크."""

from __future__ import annotations

import logging
import time

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def generate_daily_actions_for_user(self, user_id: int) -> None:
    """단일 사용자의 일일 행동과 핵심 질문을 Gemma4로 생성하고 저장한다.

    Args:
        user_id: 처리할 CustomUser PK.
    """
    import httpx
    from django.conf import settings
    from django.utils import timezone

    from apps.accounts.models import CustomUser
    from apps.dashboard.models import DailyKeyQuestion, TodayAction
    from apps.goals.models import Goal
    from apps.journal.models import JournalEntry

    logger.info("[TASK:%s] daily-actions 시작: user_id=%d", self.request.id, user_id)
    start = time.monotonic()

    try:
        user = CustomUser.objects.get(pk=user_id)
    except CustomUser.DoesNotExist:
        logger.error("사용자 없음: user_id=%d", user_id)
        return

    today = timezone.localdate()
    ai_service_url = getattr(settings, "AI_SERVICE_URL", "http://ai_service:8001")
    ai_service_secret = getattr(settings, "AI_SERVICE_SECRET", "")

    # 활성 목표 수집
    goals = list(
        Goal.objects.filter(user=user, is_active=True)
        .values("category", "title", "progress")[:10]
    )

    # 최근 3일 일지 요약 수집
    recent_summaries = list(
        JournalEntry.objects.filter(user=user)
        .exclude(ai_summary="")
        .order_by("-created_at")
        .values_list("ai_summary", flat=True)[:3]
    )

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{ai_service_url}/coach/daily-actions",
                json={
                    "goals": goals,
                    "recent_journal_summaries": recent_summaries,
                    "risk_tolerance": user.risk_tolerance,
                },
                headers={"X-Service-Secret": ai_service_secret},
            )
            response.raise_for_status()
            data = response.json()

        # 기존 오늘 날짜 행동 삭제 후 재생성
        TodayAction.objects.filter(user=user, action_date=today).delete()
        TodayAction.objects.bulk_create([
            TodayAction(
                user=user,
                text=action["text"],
                category=action.get("category", "general"),
                action_date=today,
            )
            for action in data.get("actions", [])[:3]
        ])

        # 핵심 질문 저장 (오늘 날짜 upsert)
        DailyKeyQuestion.objects.update_or_create(
            user=user,
            question_date=today,
            defaults={"question": data.get("key_question", "")},
        )

        elapsed = time.monotonic() - start
        logger.info(
            "[TASK:%s] daily-actions 완료: user_id=%d elapsed=%.2fs model=%s",
            self.request.id, user_id, elapsed, data.get("model_used"),
        )

    except httpx.HTTPStatusError as exc:
        logger.warning(
            "[TASK:%s] AI 서비스 HTTP 오류 (시도 %d/%d): status=%d",
            self.request.id, self.request.retries + 1, self.max_retries, exc.response.status_code,
        )
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries)) from exc

    except httpx.RequestError as exc:
        logger.warning(
            "[TASK:%s] AI 서비스 연결 실패 (시도 %d/%d): %s",
            self.request.id, self.request.retries + 1, self.max_retries, exc,
        )
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries)) from exc


@shared_task
def generate_daily_actions_for_all_users() -> None:
    """모든 온보딩 완료 사용자의 일일 행동을 생성하는 dispatcher 태스크.

    매일 오전 6시 Celery Beat에 의해 실행된다.
    """
    from apps.accounts.models import CustomUser

    user_ids = list(
        CustomUser.objects.filter(onboarded_at__isnull=False)
        .values_list("id", flat=True)
    )
    logger.info("일일 행동 생성 dispatcher: %d명 처리 예정", len(user_ids))
    for uid in user_ids:
        generate_daily_actions_for_user.delay(uid)
```

**Celery Beat 스케줄 등록**

`backend/config/settings/base.py`의 `CELERY_BEAT_SCHEDULE` 추가:

```python
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    "generate-daily-actions-6am": {
        "task": "apps.dashboard.tasks.generate_daily_actions_for_all_users",
        "schedule": crontab(hour=6, minute=0),
    },
}
```

> **주의**: `CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"` 이미 설정됨.
> `DatabaseScheduler`는 위 `CELERY_BEAT_SCHEDULE`을 처음 실행 시 DB에 자동 등록한다.

**완료 기준**
- [ ] `celery -A config worker -l info` 실행 후 `generate_daily_actions_for_user` 태스크 발견 확인
- [ ] Django Admin → `generate_daily_actions_for_user.delay(<user_id>)` 수동 트리거 후 `TodayAction` DB 저장 확인
- [ ] Ollama 중단 상태에서 태스크 실행 → fallback 행동 3개 저장 확인 (태스크 실패 아님)

**커밋**
```
feat(backend): 일일 행동 생성 Celery 태스크 및 Beat 스케줄 추가
```

---

## 꼭지 4: Django — `DashboardView` 업데이트 + 응답 구조 정규화

현재 백엔드 응답의 `capital_score` + 중첩 `breakdown`과 프론트 `DashboardData` 타입의 flat `score` 구조가 불일치함. 이 꼭지에서 함께 수정한다.

**파일**: `backend/apps/dashboard/views.py`

```python
# backend/apps/dashboard/views.py
"""라이프 캐피털 대시보드 뷰."""

from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from apps.dashboard.services import calculate_capital_score


class DashboardView(APIView):
    """라이프 캐피털 대시보드."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """대시보드 점수와 오늘의 행동·질문을 반환한다."""
        from apps.dashboard.models import DailyKeyQuestion, TodayAction

        result = calculate_capital_score(user=request.user)
        today = timezone.localdate()

        # 오늘의 행동 DB에서 읽기
        actions = list(
            TodayAction.objects.filter(user=request.user, action_date=today)
            .values("id", "text", "category", "completed")
        )

        # 오늘의 핵심 질문 DB에서 읽기
        key_question = ""
        try:
            kq = DailyKeyQuestion.objects.get(user=request.user, question_date=today)
            key_question = kq.question
        except DailyKeyQuestion.DoesNotExist:
            pass

        return Response({
            "status": "success",
            "data": {
                # 프론트 DashboardData 타입과 일치하는 flat 구조
                "score": result.capital_score,
                "asset_stability": result.asset_stability,
                "goal_progress": result.goal_progress,
                "routine_score": result.routine_score,
                "today_actions": actions,
                "key_question": key_question,
            },
        })

    def patch(self, request: Request) -> Response:
        """오늘 행동 완료 여부를 업데이트한다."""
        from apps.dashboard.models import TodayAction
        from django.utils import timezone

        action_id = request.data.get("action_id")
        completed = request.data.get("completed")

        if action_id is None or completed is None:
            return Response(
                {"status": "error", "message": "action_id, completed 필드가 필요합니다."},
                status=400,
            )

        updated = TodayAction.objects.filter(
            id=action_id, user=request.user, action_date=timezone.localdate()
        ).update(completed=completed)

        if not updated:
            return Response({"status": "error", "message": "행동을 찾을 수 없습니다."}, status=404)

        return Response({"status": "success"})
```

**`backend/apps/dashboard/urls.py` 확인 및 PATCH 라우트 추가**

```python
# backend/apps/dashboard/urls.py
from django.urls import path
from apps.dashboard.views import DashboardView

urlpatterns = [
    path("", DashboardView.as_view()),
]
```

**완료 기준**
- [ ] `GET /api/v1/dashboard/` 응답에 `score`, `today_actions`, `key_question` 필드 확인
- [ ] `today_actions`가 빈 배열 아닌 실제 행동 3개 반환 확인 (Celery 태스크 1회 실행 후)
- [ ] `PATCH /api/v1/dashboard/` + `{"action_id": 1, "completed": true}` → DB 업데이트 확인

**커밋**
```
feat(backend): DashboardView today_actions·key_question DB 연동 및 응답 구조 정규화
```

---

## 꼭지 5: 프론트엔드 — `TodayAction` 타입 업데이트 + `TodayActions.tsx` 개선

### 5-1. 타입 업데이트

**파일**: `frontend/src/lib/types.ts`

```typescript
export type TodayAction = {
  id: number;
  text: string;
  category: string;  // "financial" | "housing" | "learning" | "routine" | "general"
  completed: boolean;
};
```

### 5-2. `TodayActions.tsx` 개선 — 번호 원형 + 카테고리 태그

**파일**: `frontend/src/components/dashboard/TodayActions.tsx`

카테고리별 색상 매핑:
```typescript
const CATEGORY_STYLES: Record<string, string> = {
  financial:  "bg-blue-50 text-blue-600",
  housing:    "bg-amber-50 text-amber-600",
  learning:   "bg-purple-50 text-purple-600",
  routine:    "bg-[var(--color-point-light)] text-[var(--color-point)]",
  general:    "bg-[var(--color-bg)] text-[var(--color-text-sub)]",
};
const CATEGORY_LABEL: Record<string, string> = {
  financial: "금융", housing: "주거", learning: "학습", routine: "루틴", general: "일반",
};
```

번호 원형(1/2/3) + 기존 체크박스 + 카테고리 태그를 합친 레이아웃:

```tsx
// 각 행동 항목
<button key={action.id} onClick={() => handleToggle(action.id)} ...>
  {/* 번호 원형 — 완료 시 체크로 변환 */}
  <span className={[
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
    done
      ? "bg-[var(--color-point)] text-white"
      : "border-2 border-[var(--color-border)] text-[var(--color-text-sub)]",
  ].join(" ")}>
    {done ? "✓" : index + 1}
  </span>

  {/* 행동 텍스트 + 카테고리 태그 */}
  <div className="flex flex-1 flex-col gap-0.5">
    <span className={done ? "text-sm line-through text-[var(--color-text-sub)]" : "text-sm text-[var(--color-text)]"}>
      {action.text}
    </span>
    <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_STYLES[action.category] ?? CATEGORY_STYLES.general}`}>
      {CATEGORY_LABEL[action.category] ?? action.category}
    </span>
  </div>
</button>
```

### 5-3. `dashboard/page.tsx` — `handleToggleAction` 수정

기존 `PATCH /dashboard/actions/{id}/` → 새 엔드포인트 `PATCH /dashboard/` 방식으로 변경:

```typescript
async function handleToggleAction(id: number, completed: boolean) {
  await api.patch("/dashboard", { action_id: id, completed });
}
```

**완료 기준**
- [ ] 대시보드에서 행동 3개가 번호 원형(1/2/3) + 카테고리 태그로 표시
- [ ] 체크 시 원형이 ✓로 바뀌고 텍스트 줄긋기 확인
- [ ] `npx tsc --noEmit` 타입 에러 없음
- [ ] `npm run build` 통과

**커밋**
```
feat(frontend): TodayActions 번호·카테고리 태그 UI 개선 및 API 연동 수정
```

---

## 세션 완료 후

```bash
# 빌드 확인
cd frontend && npm run build && npx tsc --noEmit

git push origin feat/dashboard-ai-daily-actions

gh pr create \
  --base dev \
  --title "[feat] 대시보드 AI 연결 — Gemma4 일일 행동·핵심 질문 생성" \
  --body "$(cat <<'EOF'
## 개요
대시보드의 빈 today_actions와 key_question을 Gemma4로 생성하여 채운다.
매일 오전 6시 Celery beat가 모든 사용자의 행동 3개 + 질문을 DB에 저장한다.

## 변경 사항
- [ ] ai_service: POST /coach/daily-actions 라우터 + 스키마 추가
- [ ] ai_service: GemmaClient.generate_daily_actions() 메서드 + fallback
- [ ] backend: TodayAction·DailyKeyQuestion 모델 + 마이그레이션
- [ ] backend: generate_daily_actions_for_user/all Celery 태스크
- [ ] backend: Celery Beat 오전 6시 스케줄
- [ ] backend: DashboardView today_actions·key_question DB 연동 + 응답 구조 정규화
- [ ] frontend: TodayAction 타입에 category 추가
- [ ] frontend: TodayActions.tsx 번호+카테고리 태그 UI 개선

## 테스트
- [ ] curl /coach/daily-actions → actions 3개 반환 확인
- [ ] Ollama 중단 후 fallback 반환 확인 (503 아님)
- [ ] Celery 태스크 수동 트리거 후 TodayAction DB 저장 확인
- [ ] GET /api/v1/dashboard/ → today_actions 실제 데이터 반환 확인
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] Google Style Docstring 작성
- [ ] Type Hinting 적용
- [ ] logging 모듈 사용 (print 없음)
- [ ] 환경변수 하드코딩 없음
- [ ] Claude Agent SDK 미사용 — Gemma4 (Ollama) 전용
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/dashboard-ai-daily-actions" \
  --body "$(cat <<'EOF'
[feat] 대시보드 AI 연결 — Gemma4 일일 행동·핵심 질문 생성

- POST /coach/daily-actions 엔드포인트 (Gemma4 + fallback)
- TodayAction·DailyKeyQuestion 모델 + 마이그레이션
- Celery beat 오전 6시 전사 dispatcher 태스크
- DashboardView 응답 구조 정규화 (flat + today_actions DB 연동)
- TodayActions.tsx 번호 원형 + 카테고리 태그 UI
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/dashboard-ai-daily-actions

mv prompts/session_17_dashboard_ai.md prompts/_complete/
```
