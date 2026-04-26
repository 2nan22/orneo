# Session 22: DART 공시 & K-MOOC 연동 완성도 향상

> **세션 목표**: 이미 연결된 DART·K-MOOC API를 실제로 체감되는 수준으로 완성한다.
> **예상 소요**: 1.5~2시간
> **작업량 기준**: 프론트엔드·AI서비스 집중 (백엔드 변경 최소)
> **브랜치**: `feat/dart-kmooc-polish` (dev에서 분기)
> **선행 세션**: Session 21 (Kakao 지도) 완료 후 진행

---

## 현황 진단

### DART API — 연동됨, 활용도 낮음

| 항목 | 현황 |
|------|------|
| API 키 | `.env`에 설정됨 (`DART_API_KEY`) |
| 연동 체인 | `JournalCard` → `DartDisclosureBadge` → Next.js route → AI service → DART OpenAPI |
| 문제 1 | 뱃지 클릭 불가 — DART 페이지 링크 없음 |
| 문제 2 | 제목에서 회사명 추출이 단순 regex → 실패 케이스 다수 |
| 문제 3 | investment 카테고리 여부 무관하게 모든 JournalCard에 뱃지 시도 |

### K-MOOC API — 연동됨, 미사용 상태

| 항목 | 현황 |
|------|------|
| API 키 | `.env`에 `KMOOC_LECTURE_ENDPOINT` 있음 (별도 인증키 필요 여부 확인 필요) |
| 연동 체인 | `CourseSuggestionCard` (goals 페이지) → Next.js route → AI service → K-MOOC API |
| 문제 1 | goals 페이지에서 카드가 보이지 않거나 실제 동작 미확인 |
| 문제 2 | 카드 UX가 미완성 (열기/닫기 토글만 있음) |

---

## 꼭지 1: DART DartDisclosureBadge 개선

**파일**: `frontend/src/components/journal/DartDisclosureBadge.tsx`

### 변경 사항

1. **investment 카테고리만 표시** — props로 `category` 받아서 `investment`일 때만 렌더
2. **클릭 가능 링크** — `disclosure.url` (DART 상세 페이지)로 이동
3. **회사명 추출 개선** — 기존 regex에 더 많은 접미어 패턴 추가 + `investment` 카테고리에서만 추출 시도

```tsx
// 변경 전 Props
interface Props { title: string }

// 변경 후 Props
interface Props { title: string; category: string }

// investment 카테고리 아닐 때 null 반환
if (category !== "investment") return null;
```

링크 UI:
```tsx
<a
  href={disclosure.url}
  target="_blank"
  rel="noopener noreferrer"
  className="mt-1 inline-flex items-center gap-1 rounded-full
             bg-blue-50 px-2 py-0.5 hover:bg-blue-100 transition-colors"
  title="이 데이터는 참고용이며 투자 권유가 아닙니다."
>
  <span className="text-[10px] font-medium text-[var(--color-primary)]">
    {disclosure.corp_name} 최근 공시 →
  </span>
</a>
```

**JournalCard에 category 전달**:
```tsx
// frontend/src/components/journal/JournalCard.tsx
<DartDisclosureBadge title={entry.title} category={entry.category} />
```

**완료 기준**
- [ ] investment 카테고리 일지에만 뱃지 표시 확인
- [ ] 뱃지 클릭 → DART 공시 상세 페이지 새 탭 열림 확인
- [ ] 다른 카테고리 일지에는 뱃지 미표시 확인

**커밋**
```
fix(frontend): DartDisclosureBadge 클릭 링크 추가 + investment 카테고리 한정
```

---

## 꼭지 2: DART 회사명 추출 개선 (AI service)

**파일**: `ai_service/routers/public_data.py`

현재 회사명 추출은 프론트 regex에만 의존. AI service 엔드포인트에서
`corp_name`이 비어 있거나 DART 조회 결과가 없을 때 graceful 처리 확인.

또한 현재 `corp_name` 파라미터를 그대로 DART API에 전달하는데,
검색 결과가 없을 때 `status: "013"` (조회결과없음) 처리가 있는지 확인.

```python
# ai_service/services/public_data/dart.py
# status "013" = 조회결과 없음 → 빈 리스트 반환 (현재 구현 확인)
if raw.get("status") not in ("000", "013"):
    raise ValueError(...)
items = raw.get("list", [])  # "013"이면 list 없음 → [] 반환
```

→ 현재 구현 확인 후 수정 필요 시 수정.

**완료 기준**
- [ ] 회사명 없거나 DART 결과 없을 때 빈 배열 반환 확인 (500 아님)

**커밋** (필요 시)
```
fix(ai_service): DART 조회결과없음(013) graceful 처리
```

---

## 꼭지 3: K-MOOC API 실제 동작 확인 및 goals 페이지 연동

**파일**: `frontend/src/components/goals/CourseSuggestionCard.tsx`
**파일**: `frontend/src/app/api/public-data/kmooc/route.ts`
**파일**: `frontend/src/app/(app)/goals/page.tsx`

### 3-1. K-MOOC API 키 확인

`ai_service/config.py`에서 `kmooc_api_key` 필드 확인.
K-MOOC API는 공공데이터포털 인증키가 필요한지, 별도 기관 키가 필요한지 확인.

`.env.example`에 명시:
```bash
# K-MOOC 강좌 정보 API
KMOOC_API_KEY=        # 공공데이터포털 DATA_GO_KR_SERVICE_KEY와 동일한 값 사용 가능
KMOOC_LECTURE_ENDPOINT=https://apis.data.go.kr/B552881/kmooc_v2_0
```

### 3-2. CourseSuggestionCard UI 개선

현재: 단순 토글 + 강좌명만 표시
개선:
- 기관명(`org_name`) 표시
- 강좌 설명(`short_description`) 2줄 표시
- K-MOOC 강좌 페이지 링크 추가

```tsx
{courses.map((c) => (
  <a
    key={c.course_id}
    href={`https://www.kmooc.kr/courses/${c.course_id}/about`}
    target="_blank"
    rel="noopener noreferrer"
    className="block rounded-lg border border-[var(--color-border)]
               px-3 py-2 hover:border-[var(--color-primary)] transition-colors"
  >
    <p className="text-xs font-medium text-[var(--color-text)]">{c.course_name}</p>
    <p className="text-[10px] text-[var(--color-text-sub)]">{c.org_name}</p>
    {c.short_description && (
      <p className="mt-0.5 line-clamp-2 text-[10px] text-[var(--color-text-sub)]">
        {c.short_description}
      </p>
    )}
  </a>
))}
```

### 3-3. goals 페이지에서 CourseSuggestionCard 노출 확인

`learning` 카테고리 목표에서 자동으로 `CourseSuggestionCard`가 표시되는지 확인.
현재 goals/page.tsx에서 어떻게 keyword를 전달하는지 확인 후 필요 시 수정.

**완료 기준**
- [ ] K-MOOC API 실제 호출 → 강좌 목록 응답 확인
- [ ] CourseSuggestionCard 강좌 카드 링크 클릭 → K-MOOC 강좌 페이지 이동 확인
- [ ] 강좌 없을 때 "해당 강좌를 찾을 수 없습니다" 안내 표시

**커밋**
```
feat(frontend): K-MOOC 강좌 카드 UI 개선 + 링크 추가
```

---

## 꼭지 4: 대시보드 DART 공시 위젯 (선택 — 시간 여유 시)

투자 관련 일지가 있는 경우 대시보드에 "최근 공시" 위젯 표시.
사용자의 `investment` 카테고리 최근 일지 제목에서 회사명 추출 → DART 조회.

**파일**: `frontend/src/components/dashboard/DartWidget.tsx` (신규)

```tsx
interface Props {
  recentInvestmentTitles: string[];  // 최근 5개 investment 일지 제목
}
```

대시보드 페이지에서:
```tsx
const investmentTitles = journals
  .filter(j => j.category === "investment")
  .slice(0, 5)
  .map(j => j.title);

<DartWidget recentInvestmentTitles={investmentTitles} />
```

**완료 기준**
- [ ] 투자 일지 없을 때 위젯 미표시
- [ ] 있을 때 최근 공시 목록 표시

**커밋**
```
feat(frontend): 대시보드 DART 공시 위젯 추가
```

---

## 세션 완료 후

```bash
cd frontend && npx tsc --noEmit && npm run build

git push origin feat/dart-kmooc-polish

gh pr create \
  --base dev \
  --title "[feat] DART 공시 & K-MOOC 연동 완성도 향상" \
  --body "$(cat <<'EOF'
## 개요
이미 연결된 DART·K-MOOC API를 실제로 체감되는 수준으로 완성한다.

## 변경 사항
- [ ] DartDisclosureBadge: investment 한정 + 클릭 링크 추가
- [ ] DART API graceful 처리 확인
- [ ] K-MOOC 강좌 카드 UI 개선 (기관명·설명·링크)
- [ ] (선택) 대시보드 DART 공시 위젯

## 테스트
- [ ] investment 일지에만 DART 뱃지 표시 확인
- [ ] 뱃지 클릭 → DART 페이지 새 탭 확인
- [ ] K-MOOC 강좌 목록 실제 조회 확인
- [ ] npx tsc --noEmit + npm run build 통과

## 체크리스트
- [ ] TypeScript 타입 에러 없음
- [ ] 투자·부동산 참고용 고지 유지
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/dart-kmooc-polish" \
  --body "$(cat <<'EOF'
[feat] DART 공시 & K-MOOC 연동 완성도 향상

- DartDisclosureBadge: investment 카테고리 한정 + 클릭 링크
- K-MOOC 강좌 카드 UI 개선 (기관명·설명·MOOC 링크)
- DART 조회결과없음 graceful 처리 확인
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/dart-kmooc-polish

mv prompts/session_22_dart_kmooc_polish.md prompts/_complete/
```

---

## 참고: 현재 공공데이터 연동 현황

| API | 키 설정 | 연동 위치 | 실사용 여부 |
|-----|---------|----------|------------|
| MOLIT 실거래가 | ✅ `.env.local` | 대시보드 ApartmentCard | ✅ 동작 중 |
| DART 기업공시 | ✅ `.env` | JournalCard 뱃지 | ⚠️ 동작하나 클릭 불가 |
| K-MOOC 강좌 | ❓ 키 확인 필요 | goals CourseSuggestionCard | ❓ 미확인 |

---

*작성일: 2026-04-26*
