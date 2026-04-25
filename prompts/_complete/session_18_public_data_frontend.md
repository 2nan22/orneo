# Session 18: 공공 데이터 프론트 연결 — MOLIT·DART·K-MOOC

> **세션 목표**: ai_service에 완성된 공공 데이터 API(MOLIT·DART·K-MOOC)를 프론트엔드에 연결해 실제 데이터를 화면에 표시한다. 사용자 프로필에 `preferred_region`·`learning_interests` 필드를 추가해 개인화된 데이터 조회를 가능하게 한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 백엔드 마이그레이션 1건 + Next.js 프록시 3개 + UI 컴포넌트 3개
> **브랜치**: `feat/public-data-frontend` (dev에서 분기)
> **선행 세션**: Session 17 dev 병합 완료 필수 (Celery·모델 구조 안정화 후 진행)

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

> ⚠️ 공공 데이터는 교육·참고 목적이며 투자 권유가 아닙니다. 모든 공공 데이터 카드에 면책 고지 문구를 반드시 포함한다.

---

## 꼭지 1: Django — `CustomUser`에 `preferred_region`·`learning_interests` 추가

현재 온보딩에서 `desired_region`과 `learning_interests`를 입력받지만 `CustomUser` 모델에 저장하지 않는다. MOLIT API의 `lawd_cd`와 K-MOOC 검색 키워드로 활용하기 위해 추가한다.

### 1-1. 모델 필드 추가

**파일**: `backend/apps/accounts/models.py`

```python
class CustomUser(AbstractUser):
    # ... 기존 필드 유지 ...

    # 신규 추가
    preferred_region = models.CharField(
        max_length=100,
        blank=True,
        help_text="희망 지역 (예: 서울 성동구). 온보딩 시 입력.",
    )
    preferred_region_code = models.CharField(
        max_length=10,
        blank=True,
        help_text="법정동 코드 5자리 (예: 11200). MOLIT API 조회용.",
    )
    learning_interests = models.JSONField(
        default=list,
        blank=True,
        help_text="학습 관심사 태그 목록 (예: ['IT', '금융'])",
    )
```

> **`preferred_region_code`**: MOLIT API는 5자리 법정동 코드가 필요하다. 온보딩에서 텍스트로 입력받으므로 초기엔 빈 값으로 저장하고, 사용자가 설정에서 직접 코드를 입력하거나 나중에 지역명→코드 변환 로직을 추가한다.

### 1-2. `OnboardingSerializer` 및 `complete_onboarding` 서비스 업데이트

**파일**: `backend/apps/accounts/serializers.py`

```python
class OnboardingSerializer(serializers.Serializer):
    # ... 기존 필드 유지 ...
    desired_region = serializers.CharField(max_length=100, required=False, allow_blank=True)
    learning_interests = serializers.ListField(
        child=serializers.CharField(), max_length=10, required=False, default=list,
    )
```

**파일**: `backend/apps/accounts/services.py` — `complete_onboarding` 함수 update_fields 확장

```python
user.risk_tolerance = risk_tolerance
user.preferred_region = data.get("desired_region", "")
user.learning_interests = data.get("learning_interests", [])
user.onboarded_at = timezone.now()
user.save(update_fields=[
    "risk_tolerance", "preferred_region", "learning_interests",
    "onboarded_at", "updated_at",
])
```

### 1-3. `UserProfileSerializer` 필드 추가

**파일**: `backend/apps/accounts/serializers.py`

```python
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "id", "username", "email", "subscription_plan",
            "risk_tolerance", "onboarded_at", "primary_provider",
            "preferred_region", "preferred_region_code", "learning_interests",  # 신규
            "created_at",
        ]
        read_only_fields = fields
```

### 1-4. 마이그레이션

```bash
cd backend
python manage.py makemigrations accounts --name="add_preferred_region_learning_interests"
python manage.py migrate
```

**완료 기준**
- [ ] `python manage.py migrate` 성공
- [ ] `GET /api/v1/auth/profile/` 응답에 `preferred_region`, `learning_interests` 필드 포함
- [ ] 온보딩 완료 후 `preferred_region` DB 저장 확인

**커밋**
```
feat(backend): CustomUser에 preferred_region·learning_interests 추가 및 마이그레이션
```

---

## 꼭지 2: Next.js — ai_service 공공 데이터 프록시 라우트 신설

ai_service의 `AI_SERVICE_URL`은 서버 내부 주소(`http://ai_service:8001`)이므로 브라우저에서 직접 호출할 수 없다. Next.js Route Handler를 통해 서버 사이드에서만 호출한다.

> **기존 `/api/v1/[...path]/route.ts`** 는 Django 백엔드 프록시 전용. ai_service 공공 데이터는 별도 경로(`/api/public-data/*`)로 분리한다.

### 2-1. 공통 ai_service 클라이언트 유틸

**파일**: `frontend/src/lib/ai-service.ts` (신규)

```typescript
// frontend/src/lib/ai-service.ts
const AI_SERVICE_URL =
  process.env.AI_SERVICE_INTERNAL_URL ?? "http://ai_service:8001";
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET ?? "";

export async function fetchAiService<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${AI_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Service-Secret": AI_SERVICE_SECRET,
      ...options.headers,
    },
    next: { revalidate: 300 },  // 5분 캐시
  });

  if (!res.ok) {
    throw new Error(`AI Service error: ${res.status} ${path}`);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}
```

### 2-2. 아파트 실거래가 프록시

**파일**: `frontend/src/app/api/public-data/apartments/route.ts` (신규)

```typescript
// frontend/src/app/api/public-data/apartments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAiService } from "@/lib/ai-service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lawd_cd = searchParams.get("lawd_cd");
  const deal_ymd = searchParams.get("deal_ymd");

  if (!lawd_cd || !deal_ymd) {
    return NextResponse.json(
      { status: "error", message: "lawd_cd, deal_ymd 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const data = await fetchAiService(
      `/public-data/apartments/transactions?lawd_cd=${lawd_cd}&deal_ymd=${deal_ymd}`,
    );
    return NextResponse.json(data);
  } catch {
    // 공공 데이터 오류는 프론트에 에러 노출 금지 — 빈 응답 반환
    return NextResponse.json({ status: "success", data: [] });
  }
}
```

### 2-3. K-MOOC 강좌 프록시

**파일**: `frontend/src/app/api/public-data/kmooc/route.ts` (신규)

```typescript
// frontend/src/app/api/public-data/kmooc/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAiService } from "@/lib/ai-service";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") ?? "";
  if (!keyword) {
    return NextResponse.json({ status: "success", data: [] });
  }
  try {
    const data = await fetchAiService(
      `/public-data/kmooc/courses?keyword=${encodeURIComponent(keyword)}`,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "success", data: [] });
  }
}
```

### 2-4. DART 공시 프록시

**파일**: `frontend/src/app/api/public-data/dart/route.ts` (신규)

```typescript
// frontend/src/app/api/public-data/dart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAiService } from "@/lib/ai-service";

export async function GET(req: NextRequest) {
  const corp_name = req.nextUrl.searchParams.get("corp_name") ?? "";
  if (!corp_name) {
    return NextResponse.json({ status: "success", data: [] });
  }
  try {
    const data = await fetchAiService(
      `/public-data/dart/disclosures?corp_name=${encodeURIComponent(corp_name)}`,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "success", data: [] });
  }
}
```

### 2-5. `.env.example` 업데이트

```bash
# .env.example (루트) 에 추가
AI_SERVICE_INTERNAL_URL=http://ai_service:8001
AI_SERVICE_SECRET=

# frontend/.env.example 에 추가 (서버 사이드 전용 — NEXT_PUBLIC_ 접두사 없음)
AI_SERVICE_INTERNAL_URL=http://localhost:8001
AI_SERVICE_SECRET=
```

**완료 기준**
- [ ] `curl "http://localhost:3000/api/public-data/kmooc?keyword=데이터분석"` → 강좌 목록 또는 빈 배열 반환 (에러 아님)
- [ ] ai_service 미실행 상태에서 동일 호출 → 빈 배열 반환 (503 아님) 확인
- [ ] `AI_SERVICE_INTERNAL_URL`이 브라우저 Network 탭에 노출되지 않음 확인

**커밋**
```
feat(frontend): ai_service 공공 데이터 Next.js 프록시 라우트 신설
```

---

## 꼭지 3: 대시보드 — 실거래가 카드 (`ApartmentCard`) 신설

사용자에게 희망 지역의 최근 아파트 실거래가 5건을 대시보드에 표시한다.

**파일**: `frontend/src/components/dashboard/ApartmentCard.tsx` (신규)

```tsx
// frontend/src/components/dashboard/ApartmentCard.tsx
"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";

interface Transaction {
  deal_amount: string;
  area: string;
  floor: string;
  deal_date: string;
  apartment_name: string;
}

interface Props {
  lawdCd: string;   // 법정동 코드 5자리
  dealYmd: string;  // YYYYMM
  regionName: string;
}

export default function ApartmentCard({ lawdCd, dealYmd, regionName }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lawdCd) { setLoading(false); return; }

    fetch(`/api/public-data/apartments?lawd_cd=${lawdCd}&deal_ymd=${dealYmd}`)
      .then((r) => r.json())
      .then((json) => setTransactions((json?.data ?? []).slice(0, 5)))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [lawdCd, dealYmd]);

  // 지역코드 없거나 데이터 없으면 카드 숨김 (에러 노출 금지)
  if (!lawdCd || (!loading && transactions.length === 0)) return null;

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          {regionName} 실거래가
        </p>
        <span className="text-[10px] text-[var(--color-text-sub)]">{dealYmd.slice(0,4)}년 {dealYmd.slice(4)}월</span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1,2,3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {transactions.map((t, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-3 py-2">
              <div>
                <p className="text-xs font-medium text-[var(--color-text)]">{t.apartment_name}</p>
                <p className="text-[10px] text-[var(--color-text-sub)]">{t.area}㎡ · {t.floor}층 · {t.deal_date}</p>
              </div>
              <p className="text-sm font-bold text-[var(--color-primary)]">
                {Number(t.deal_amount.replace(/,/g, "")).toLocaleString("ko-KR")}만
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 출처 및 면책 고지 — 필수 */}
      <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">
        출처: 국토교통부 실거래가 자료 (참고용) · 이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다.
      </p>
    </Card>
  );
}
```

**`dashboard/page.tsx`에 `ApartmentCard` 통합**

```tsx
// 사용자 프로필 조회 (useEffect 내)
const [profile, setProfile] = useState<{ preferred_region_code: string; preferred_region: string } | null>(null);

useEffect(() => {
  api.get<{ preferred_region_code: string; preferred_region: string }>("/auth/profile")
    .then(setProfile)
    .catch(() => {});
}, []);

// 대시보드 하단에 추가 (housing 목표 있는 사용자만)
{profile?.preferred_region_code && (
  <ApartmentCard
    lawdCd={profile.preferred_region_code}
    dealYmd={new Date().toISOString().slice(0, 7).replace("-", "")}
    regionName={profile.preferred_region || "희망 지역"}
  />
)}
```

**완료 기준**
- [ ] `preferred_region_code`가 있는 사용자에게 실거래가 카드 표시
- [ ] `preferred_region_code` 없는 사용자에게 카드 숨김 확인
- [ ] ai_service 미실행 시 카드 숨김 확인 (에러 표시 없음)
- [ ] "투자 권유가 아닙니다" 면책 고지 텍스트 표시 확인

**커밋**
```
feat(frontend): 대시보드 실거래가 카드 (ApartmentCard) 추가
```

---

## 꼭지 4: 목표 화면 — K-MOOC 추천 카드 (`CourseSuggestionCard`) 신설

학습 목표(`category="learning"`)가 있는 경우, 목표 카드 아래에 관련 K-MOOC 강좌 3개를 표시한다.

**파일**: `frontend/src/components/goals/CourseSuggestionCard.tsx` (신규)

```tsx
// frontend/src/components/goals/CourseSuggestionCard.tsx
"use client";

import { useEffect, useState } from "react";

interface Course { course_name: string; org_name: string; course_id: string; }

export default function CourseSuggestionCard({ keyword }: { keyword: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !keyword) return;
    setLoading(true);
    fetch(`/api/public-data/kmooc?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => setCourses((json?.data ?? []).slice(0, 3)))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [open, keyword]);

  return (
    <div className="mt-2 border-t border-[var(--color-border)] pt-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between text-xs font-medium
                   text-[var(--color-point)] hover:opacity-80"
      >
        관련 K-MOOC 강좌 보기
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {loading ? (
            <p className="text-xs text-[var(--color-text-sub)]">검색 중...</p>
          ) : courses.length === 0 ? (
            <p className="text-xs text-[var(--color-text-sub)]">관련 강좌가 없습니다.</p>
          ) : (
            courses.map((c, i) => (
              <div key={i} className="rounded-lg bg-[var(--color-bg)] px-3 py-2">
                <p className="text-xs font-medium text-[var(--color-text)]">{c.course_name}</p>
                <p className="text-[10px] text-[var(--color-text-sub)]">{c.org_name}</p>
              </div>
            ))
          )}
          {/* 출처 및 면책 고지 — 필수 */}
          <p className="text-[10px] text-[var(--color-text-sub)]">
            출처: K-MOOC 한국형 온라인 공개강좌 (참고용)
          </p>
        </div>
      )}
    </div>
  );
}
```

**`GoalCard.tsx`에 통합** — `category === "learning"` 인 경우에만 렌더링

```tsx
// frontend/src/components/goals/GoalCard.tsx 하단에 추가
{goal.category === "learning" && (
  <CourseSuggestionCard keyword={goal.title} />
)}
```

**완료 기준**
- [ ] `learning` 카테고리 목표 카드에 "관련 K-MOOC 강좌 보기" 버튼 표시
- [ ] 버튼 클릭 시 강좌 목록 접기/펼치기 동작
- [ ] ai_service 미실행 시 "관련 강좌가 없습니다." 표시 (에러 없음)
- [ ] 출처 표기 "K-MOOC 한국형 온라인 공개강좌 (참고용)" 표시 확인

**커밋**
```
feat(frontend): 목표 화면 K-MOOC 강좌 추천 카드 추가
```

---

## 꼭지 5: 일지 화면 — DART 공시 배지 (`DartDisclosureBadge`) 신설

투자 일지(`category="investment"`) 제목에서 종목명을 추출해 최근 DART 공시 1건을 배지로 표시한다.

**파일**: `frontend/src/components/journal/DartDisclosureBadge.tsx` (신규)

```tsx
// frontend/src/components/journal/DartDisclosureBadge.tsx
"use client";

import { useEffect, useState } from "react";

interface Disclosure { corp_name: string; report_nm: string; rcept_dt: string; }

// 제목에서 종목명 추출 (간단한 패턴: 2~6자 한글/영문)
function extractCorpName(title: string): string {
  const match = title.match(/([가-힣A-Za-z]{2,6}(?:전자|증권|화학|에너지|바이오|건설|금융)?)/);
  return match?.[1] ?? "";
}

export default function DartDisclosureBadge({ title }: { title: string }) {
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const corpName = extractCorpName(title);

  useEffect(() => {
    if (!corpName) return;
    fetch(`/api/public-data/dart?corp_name=${encodeURIComponent(corpName)}`)
      .then((r) => r.json())
      .then((json) => {
        const first = (json?.data ?? [])[0];
        setDisclosure(first ?? null);
      })
      .catch(() => setDisclosure(null));
  }, [corpName]);

  // 데이터 없으면 배지 숨김
  if (!disclosure) return null;

  return (
    <div
      className="mt-1 inline-flex items-center gap-1 rounded-full
                 bg-[var(--color-primary-light)] px-2 py-0.5"
      title="이 데이터는 참고용이며 투자 권유가 아닙니다."
    >
      <span className="text-[10px] font-medium text-[var(--color-primary)]">
        {disclosure.corp_name} 최근 공시 ›
      </span>
    </div>
  );
}
```

**`JournalCard.tsx`에 통합** — `category === "investment"` 인 경우에만 렌더링

```tsx
// frontend/src/components/journal/JournalCard.tsx
import DartDisclosureBadge from "./DartDisclosureBadge";

// 카드 내 제목 아래에 추가
{entry.category === "investment" && (
  <DartDisclosureBadge title={entry.title} />
)}
```

**완료 기준**
- [ ] `investment` 카테고리 일지 카드에 종목명이 추출될 경우 DART 공시 배지 표시
- [ ] 종목명 미추출 또는 ai_service 미실행 시 배지 숨김 (에러 없음)
- [ ] 배지 호버 시 "투자 권유가 아닙니다" 툴팁 표시 (`title` 속성)
- [ ] `npm run build` + `npx tsc --noEmit` 통과

**커밋**
```
feat(frontend): 일지 화면 DART 공시 배지 (DartDisclosureBadge) 추가
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin feat/public-data-frontend

gh pr create \
  --base dev \
  --title "[feat] 공공 데이터 프론트 연결 — MOLIT·DART·K-MOOC" \
  --body "$(cat <<'EOF'
## 개요
ai_service의 공공 데이터 API를 프론트엔드와 연결한다.
SSRF 방지를 위해 Next.js Route Handler를 서버 사이드 프록시로 사용.

## 변경 사항
- [ ] backend: CustomUser에 preferred_region·preferred_region_code·learning_interests 추가 + 마이그레이션
- [ ] backend: OnboardingSerializer·complete_onboarding·UserProfileSerializer 업데이트
- [ ] frontend: /api/public-data/{apartments,kmooc,dart} 프록시 라우트 신설
- [ ] frontend: ai-service.ts 공통 클라이언트 유틸 신설
- [ ] frontend: ApartmentCard (대시보드) — 실거래가 5건 + 면책 고지
- [ ] frontend: CourseSuggestionCard (goals) — K-MOOC 강좌 3건 접기/펼치기
- [ ] frontend: DartDisclosureBadge (journal) — DART 공시 배지

## 테스트
- [ ] curl /api/public-data/kmooc?keyword=데이터분석 → 빈 배열 또는 강좌 목록 (에러 없음)
- [ ] ai_service 미실행 시 각 UI 컴포넌트 숨김 확인
- [ ] preferred_region_code 없는 사용자 ApartmentCard 미표시 확인
- [ ] 면책 고지 문구 표시 확인 (MOLIT·DART 카드)
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] Google Style Docstring 작성
- [ ] Type Hinting 적용
- [ ] logging 모듈 사용 (print 없음)
- [ ] 환경변수 하드코딩 없음
- [ ] AI_SERVICE_INTERNAL_URL 브라우저 노출 없음 (서버 사이드 전용)
- [ ] 면책 고지: "이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다." 전 카드 포함
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/public-data-frontend" \
  --body "$(cat <<'EOF'
[feat] 공공 데이터 프론트 연결 — MOLIT·DART·K-MOOC

- CustomUser preferred_region·learning_interests 필드 추가
- Next.js 서버 사이드 공공 데이터 프록시 3개 신설
- 대시보드 ApartmentCard (실거래가 + 면책 고지)
- 목표 화면 CourseSuggestionCard (K-MOOC 접기/펼치기)
- 일지 화면 DartDisclosureBadge (DART 공시 배지)
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/public-data-frontend

mv prompts/session_18_public_data_frontend.md prompts/_complete/
```
