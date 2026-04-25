# Session 20: GoalGrid 델타 표시 + 설정 프로필 편집

> **세션 목표**: 대시보드에 전주 대비 점수 변화량(δ)을 표시하는 GoalGrid 컴포넌트를 추가하고, 설정 페이지의 프로필 편집 기능을 완성한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 백엔드 1곳 + 프론트엔드 컴포넌트 2개 + 설정 폼
> **브랜치**: `feat/goalGrid-settings` (dev에서 분기)
> **선행 세션**: 독립적으로 진행 가능 (Session 17 이후라면 더 자연스러움)

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

---

## 꼭지 1: Django — `DashboardView` 델타 계산 추가

`CapitalScoreSnapshot` 모델에 일별 스냅샷이 누적되므로, 이번 주와 지난주 스냅샷을 비교해 변화량을 계산한다.

**파일**: `backend/apps/dashboard/views.py`

```python
# backend/apps/dashboard/views.py
"""라이프 캐피털 대시보드 뷰."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.dashboard.services import calculate_capital_score

logger = logging.getLogger(__name__)


def _get_delta(user, today) -> dict | None:
    """이번 주와 7일 전 스냅샷을 비교하여 델타를 반환한다.

    Args:
        user: 스냅샷 조회 대상 사용자.
        today: 오늘 날짜.

    Returns:
        델타 딕셔너리 또는 기준 스냅샷 없으면 None.
    """
    from apps.dashboard.models import CapitalScoreSnapshot

    try:
        current = CapitalScoreSnapshot.objects.get(user=user, score_date=today)
    except CapitalScoreSnapshot.DoesNotExist:
        return None

    last_week = today - timedelta(days=7)
    try:
        previous = CapitalScoreSnapshot.objects.get(user=user, score_date=last_week)
    except CapitalScoreSnapshot.DoesNotExist:
        # 7일 전 스냅샷 없으면 최근 7일 내 가장 오래된 스냅샷으로 비교
        previous = (
            CapitalScoreSnapshot.objects
            .filter(user=user, score_date__lt=today)
            .order_by("-score_date")
            .first()
        )
        if previous is None:
            return None

    return {
        "score":           round(current.capital_score   - previous.capital_score,   1),
        "asset_stability": round(current.asset_stability - previous.asset_stability, 1),
        "goal_progress":   round(current.goal_progress   - previous.goal_progress,   1),
        "routine_score":   round(current.routine_score   - previous.routine_score,   1),
    }


class DashboardView(APIView):
    """라이프 캐피털 대시보드."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """대시보드 점수, 델타, 오늘의 행동·질문을 반환한다."""
        from apps.dashboard.models import DailyKeyQuestion, TodayAction

        result = calculate_capital_score(user=request.user)
        today = timezone.localdate()

        actions = list(
            TodayAction.objects.filter(user=request.user, action_date=today)
            .values("id", "text", "category", "completed")
        )

        key_question = ""
        try:
            kq = DailyKeyQuestion.objects.get(user=request.user, question_date=today)
            key_question = kq.question
        except DailyKeyQuestion.DoesNotExist:
            pass

        delta = _get_delta(user=request.user, today=today)

        return Response({
            "status": "success",
            "data": {
                "score": result.capital_score,
                "asset_stability": result.asset_stability,
                "goal_progress": result.goal_progress,
                "routine_score": result.routine_score,
                "delta": delta,          # 없으면 null
                "today_actions": actions,
                "key_question": key_question,
            },
        })

    def patch(self, request: Request) -> Response:
        """오늘 행동 완료 여부를 업데이트한다."""
        from apps.dashboard.models import TodayAction

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

**완료 기준**
- [ ] `GET /api/v1/dashboard/` 응답에 `delta` 필드 포함 확인
- [ ] 스냅샷 1개만 있는 경우 `delta: null` 반환 확인
- [ ] 7일 전 스냅샷 있는 경우 `delta.score`가 숫자 (양수/음수/0) 반환 확인

**커밋**
```
feat(backend): DashboardView 전주 대비 델타 계산 추가
```

---

## 꼭지 2: 프론트엔드 — `DashboardData` 타입 업데이트 + `GoalGrid.tsx` 신설

### 2-1. 타입 업데이트

**파일**: `frontend/src/lib/types.ts`

```typescript
export type ScoreDelta = {
  score: number;
  asset_stability: number;
  goal_progress: number;
  routine_score: number;
};

export type DashboardData = {
  score: number;
  asset_stability: number;
  goal_progress: number;
  routine_score: number;
  delta: ScoreDelta | null;   // 신규
  key_question: string;
  today_actions: TodayAction[];
};
```

### 2-2. `GoalGrid.tsx` 신설

자산 안정성 / 목표 진척 / 루틴 3개 지표를 3-컬럼 카드로 표시한다.
델타가 있으면 각 카드에 배지로 표시.

**파일**: `frontend/src/components/dashboard/GoalGrid.tsx` (신규)

```tsx
// frontend/src/components/dashboard/GoalGrid.tsx
import type { ScoreDelta } from "@/lib/types";

interface GridItem {
  label: string;
  value: number;
  deltaKey: keyof ScoreDelta;
  icon: React.ReactNode;
  unit?: string;
}

interface Props {
  assetStability: number;
  goalProgress: number;
  routineScore: number;
  delta: ScoreDelta | null;
}

// 델타 배지 컴포넌트
function DeltaBadge({ value }: { value: number | undefined }) {
  if (value === undefined || value === null) return null;
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <span className={[
      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
      isNeutral  ? "bg-[var(--color-bg)] text-[var(--color-text-sub)]" :
      isPositive ? "bg-[var(--color-point-light)] text-[var(--color-point)]" :
                   "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
    ].join(" ")}>
      {isPositive ? `+${value}` : `${value}`}
    </span>
  );
}

export default function GoalGrid({ assetStability, goalProgress, routineScore, delta }: Props) {
  const items: GridItem[] = [
    {
      label: "자산 안정성",
      value: assetStability,
      deltaKey: "asset_stability",
      unit: "점",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      ),
    },
    {
      label: "목표 진척",
      value: goalProgress,
      deltaKey: "goal_progress",
      unit: "점",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
    },
    {
      label: "이번 주 루틴",
      value: routineScore,
      deltaKey: "routine_score",
      unit: "점",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.label}
             className="flex flex-col gap-1 rounded-[var(--radius-lg)]
                        bg-[var(--color-bg)] px-3 py-3">
          {/* 아이콘 */}
          <span className="text-[var(--color-text-sub)]">{item.icon}</span>

          {/* 수치 + 델타 */}
          <div className="flex items-end gap-1">
            <span className="text-lg font-bold text-[var(--color-text)]">
              {Math.round(item.value)}
            </span>
            {delta && <DeltaBadge value={delta[item.deltaKey]} />}
          </div>

          {/* 레이블 */}
          <span className="text-[10px] text-[var(--color-text-sub)]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
```

**`dashboard/page.tsx`에 `GoalGrid` 통합**

`CapitalScoreGauge` 아래, `ScoreBreakdown` 대신 또는 함께 배치:

```tsx
// 기존 ScoreBreakdown 아래에 추가
<GoalGrid
  assetStability={d.asset_stability}
  goalProgress={d.goal_progress}
  routineScore={d.routine_score}
  delta={d.delta}
/>
```

**완료 기준**
- [ ] 대시보드에 3-컬럼 GoalGrid 카드 표시 확인
- [ ] `delta` 있을 때 각 카드에 양수(청록)·음수(빨강) 배지 표시 확인
- [ ] `delta: null` 일 때 배지 없음 확인
- [ ] 375px 모바일에서 3컬럼이 가로 스크롤 없이 표시 확인
- [ ] `npx tsc --noEmit` 타입 에러 없음

**커밋**
```
feat(frontend): GoalGrid 컴포넌트 신설 (3-컬럼 지표 + 델타 배지)
```

---

## 꼭지 3: Django — `PATCH /api/v1/auth/profile/` 엔드포인트 추가

**파일**: `backend/apps/accounts/serializers.py` — 쓰기 가능한 Serializer 신설

```python
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """사용자 프로필 수정 직렬화기.

    수정 가능 필드만 허용한다.
    """

    class Meta:
        model = CustomUser
        fields = [
            "risk_tolerance",
            "preferred_region",
            "preferred_region_code",
            "learning_interests",
        ]

    def validate_learning_interests(self, value: list) -> list:
        """학습 관심사 최대 10개 제한."""
        if len(value) > 10:
            raise serializers.ValidationError("관심사는 최대 10개까지 입력 가능합니다.")
        return value
```

**파일**: `backend/apps/accounts/views.py` — `ProfileView.patch` 메서드 추가

```python
from apps.accounts.serializers import UserProfileSerializer, UserProfileUpdateSerializer

class ProfileView(APIView):
    """내 프로필 조회 및 수정."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        """인증된 사용자의 프로필을 반환한다."""
        serializer = UserProfileSerializer(request.user)
        return Response({"status": "success", "data": serializer.data})

    def patch(self, request: Request) -> Response:
        """사용자 프로필을 부분 수정한다.

        수정 가능 필드: risk_tolerance, preferred_region,
        preferred_region_code, learning_interests.
        """
        serializer = UserProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info("프로필 수정: user_id=%d fields=%s", request.user.pk, list(request.data.keys()))

        return Response({
            "status": "success",
            "data": UserProfileSerializer(request.user).data,
        })
```

**완료 기준**
- [ ] `PATCH /api/v1/auth/profile/` + `{"risk_tolerance": "aggressive"}` → `risk_tolerance` 업데이트 확인
- [ ] `PATCH /api/v1/auth/profile/` + `{"learning_interests": ["IT","금융"]}` → DB 저장 확인
- [ ] 허용되지 않은 필드(`email` 등) 수정 시도 → 400 오류 확인

**커밋**
```
feat(backend): ProfileView PATCH 메서드 추가 (risk_tolerance·preferred_region·learning_interests)
```

---

## 꼭지 4: 프론트엔드 — 설정 페이지 프로필 편집 완성

현재 `settings/page.tsx`는 로그아웃 버튼만 있는 stub 상태.
프로필 조회 + 편집 폼을 추가한다.

**파일**: `frontend/src/app/(app)/settings/page.tsx` 전면 교체

```tsx
// frontend/src/app/(app)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import { api } from "@/lib/api";

type Profile = {
  username: string;
  email: string;
  risk_tolerance: string;
  preferred_region: string;
  preferred_region_code: string;
  learning_interests: string[];
};

const RISK_OPTIONS = [
  { value: "conservative", label: "안정형 🛡️" },
  { value: "moderate",     label: "중립형 ⚖️" },
  { value: "aggressive",   label: "공격형 🚀" },
];

const INTEREST_TAGS = ["IT", "금융", "부동산", "자기계발", "언어", "창업", "건강", "예술"];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<string | null>(null);

  // 편집 상태
  const [riskTolerance, setRiskTolerance]             = useState("");
  const [preferredRegion, setPreferredRegion]         = useState("");
  const [preferredRegionCode, setPreferredRegionCode] = useState("");
  const [learningInterests, setLearningInterests]     = useState<string[]>([]);

  useEffect(() => {
    api.get<Profile>("/auth/profile")
      .then((p) => {
        setProfile(p);
        setRiskTolerance(p.risk_tolerance);
        setPreferredRegion(p.preferred_region);
        setPreferredRegionCode(p.preferred_region_code);
        setLearningInterests(p.learning_interests);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/auth/profile", {
        risk_tolerance:        riskTolerance,
        preferred_region:      preferredRegion,
        preferred_region_code: preferredRegionCode,
        learning_interests:    learningInterests,
      });
      setToast("프로필이 저장되었습니다.");
    } catch {
      setToast("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function toggleInterest(tag: string) {
    setLearningInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  if (loading) {
    return (
      <PageContainer size="sm">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 w-32 rounded bg-[var(--color-border)]" />
          <div className="h-40 rounded-xl bg-[var(--color-border)]" />
          <div className="h-32 rounded-xl bg-[var(--color-border)]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="sm">
      <h1 className="mb-6 text-[22px] font-bold text-[var(--color-text)]">설정</h1>

      {/* 계정 정보 (읽기 전용) */}
      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">계정 정보</p>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[var(--color-text-sub)]">{profile?.email}</p>
          <p className="text-xs text-[var(--color-text-sub)]">@{profile?.username}</p>
        </div>
      </Card>

      {/* 프로필 편집 */}
      <Card className="mb-4">
        <p className="mb-4 text-sm font-semibold text-[var(--color-text)]">프로필 설정</p>

        {/* 투자 성향 */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">투자 성향</p>
          <div className="flex gap-2">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRiskTolerance(opt.value)}
                className={[
                  "flex-1 rounded-[var(--radius-lg)] border px-2 py-2 text-xs font-medium transition-all",
                  riskTolerance === opt.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[var(--color-primary)]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 희망 지역 */}
        <div className="mb-4">
          <Input
            label="희망 지역"
            placeholder="예: 서울 성동구"
            value={preferredRegion}
            onChange={(e) => setPreferredRegion(e.target.value)}
            helperText="실거래가 조회에 사용됩니다."
          />
        </div>

        {/* 법정동 코드 */}
        <div className="mb-4">
          <Input
            label="법정동 코드 (5자리)"
            placeholder="예: 11200"
            value={preferredRegionCode}
            onChange={(e) => setPreferredRegionCode(e.target.value)}
            helperText="국토교통부 MOLIT API 조회용. 지역코드 검색 후 입력하세요."
          />
        </div>

        {/* 학습 관심사 */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">학습 관심사</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleInterest(tag)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  learningInterests.includes(tag)
                    ? "border-[var(--color-point)] bg-[var(--color-point)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[var(--color-point)]",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" size="md" fullWidth onClick={handleSave} loading={saving}>
          변경 사항 저장
        </Button>
      </Card>

      {/* 알림 설정 (stub) */}
      <Card variant="outlined" className="mb-4">
        <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">알림 설정</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-text)]">일일 행동 알림</p>
            <p className="text-xs text-[var(--color-text-sub)]">매일 오전 8시 푸시 알림</p>
          </div>
          {/* 토글 UI만, 실제 기능 다음 이터레이션 */}
          <div className="flex h-6 w-11 items-center rounded-full bg-[var(--color-border)] px-0.5 opacity-50 cursor-not-allowed">
            <div className="h-5 w-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[var(--color-text-sub)]">푸시 알림 기능은 준비 중입니다.</p>
      </Card>

      {/* 온보딩 재설정 */}
      <Card variant="outlined" className="mb-4">
        <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">온보딩 재설정</p>
        <p className="mb-3 text-xs text-[var(--color-text-sub)]">
          재무 정보, 주거 상태 등 초기 설정을 다시 진행합니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/onboarding")}
        >
          온보딩 다시 시작
        </Button>
      </Card>

      {/* 로그아웃 */}
      <Card variant="outlined">
        <Button variant="danger" size="md" fullWidth onClick={handleLogout}>
          로그아웃
        </Button>
      </Card>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast}
          type={toast.includes("실패") ? "error" : "success"}
          onDismiss={() => setToast(null)}
        />
      )}
    </PageContainer>
  );
}
```

**완료 기준**
- [ ] 설정 페이지 프로필 로딩 후 기존 값 사전 입력 확인
- [ ] 투자 성향 선택 → 저장 → API 호출 → Toast "프로필이 저장되었습니다." 표시
- [ ] 희망 지역 + 법정동 코드 입력 후 저장 → DB 반영 확인
- [ ] 학습 관심사 토글 동작 확인
- [ ] 알림 설정 토글 disabled(opacity-50, cursor-not-allowed) 표시
- [ ] "온보딩 다시 시작" 버튼 → `/onboarding` 이동 확인
- [ ] 로그아웃 → `/login` 이동 확인
- [ ] 375px 모바일에서 레이아웃 깨짐 없음 확인
- [ ] `npm run build` + `npx tsc --noEmit` 통과

**커밋**
```
feat(frontend): 설정 페이지 프로필 편집 완성 (투자성향·지역·관심사)
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin feat/goalGrid-settings

gh pr create \
  --base dev \
  --title "[feat] GoalGrid 델타 표시 + 설정 프로필 편집 완성" \
  --body "$(cat <<'EOF'
## 개요
대시보드에 전주 대비 점수 변화량(GoalGrid)을 추가하고,
설정 페이지 프로필 편집(투자 성향·지역·관심사)을 완성한다.

## 변경 사항
- [ ] backend: DashboardView _get_delta() 함수 추가, 응답에 delta 필드 포함
- [ ] backend: ProfileView PATCH 메서드 추가 (UserProfileUpdateSerializer)
- [ ] frontend: DashboardData 타입에 delta: ScoreDelta | null 추가
- [ ] frontend: GoalGrid 컴포넌트 신설 (3-컬럼 + 델타 배지)
- [ ] frontend: dashboard/page.tsx에 GoalGrid 통합
- [ ] frontend: settings/page.tsx 프로필 편집 완성 (투자성향·지역·관심사·알림stub·온보딩재설정)

## 테스트
- [ ] GET /api/v1/dashboard/ → delta 필드 포함 확인
- [ ] 스냅샷 1개일 때 delta: null 확인
- [ ] PATCH /api/v1/auth/profile/ risk_tolerance 업데이트 확인
- [ ] GoalGrid 3컬럼 표시 + 델타 배지 확인 (양수=청록, 음수=빨강)
- [ ] 설정 저장 Toast 표시 + DB 반영 확인
- [ ] 375px 모바일 확인
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] Google Style Docstring 작성
- [ ] Type Hinting 적용
- [ ] logging 모듈 사용 (print 없음)
- [ ] 환경변수 하드코딩 없음
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/goalGrid-settings" \
  --body "$(cat <<'EOF'
[feat] GoalGrid 델타 표시 + 설정 프로필 편집 완성

- DashboardView 전주 대비 델타 계산 (_get_delta)
- ProfileView PATCH (risk_tolerance·preferred_region·learning_interests)
- GoalGrid.tsx 3-컬럼 + 델타 배지 (양수=청록/음수=빨강)
- settings/page.tsx 프로필 편집 완성 (투자성향·지역·관심사·알림stub)
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/goalGrid-settings

# ★ [마일스톤 M5] Session 17~20 완성 — AI 기능·공공 데이터·설정 완성
# Session 17~20 모두 dev 병합 완료 후:
gh pr create \
  --base main \
  --title "[feat] AI 기능·공공 데이터·DecisionStudio·설정 완성 (Session 17~20)" \
  --body "$(cat <<'EOF'
## 개요
Session 17~20 기능 사이클 완성.

## 포함 내용
- Session 17: Gemma4 일일 행동·핵심 질문 생성 + Celery beat
- Session 18: MOLIT·DART·K-MOOC 공공 데이터 프론트 연결
- Session 19: DecisionStudio A/B/C 시나리오 생성 + UI
- Session 20: GoalGrid 델타 표시 + 설정 프로필 편집 완성

## 테스트
- [ ] E2E 플로우 전체 통과
- [ ] npm run build 통과
EOF
)"

gh pr merge <main-pr-number> \
  --merge \
  --subject "Merge pull request #N from 2nan22/dev" \
  --body "$(cat <<'EOF'
[feat] AI 기능·공공 데이터·DecisionStudio·설정 완성

- Gemma4 일일 행동 생성 (Celery beat 오전 6시)
- MOLIT·K-MOOC·DART 공공 데이터 UI 연결
- DecisionStudio A/B/C 시나리오 (investment·housing)
- GoalGrid 델타 배지 + 설정 프로필 편집 완성
EOF
)"

git tag v0.5.0-ai-features && git push origin v0.5.0-ai-features

mv prompts/session_20_goalGrid_settings.md prompts/_complete/
```
