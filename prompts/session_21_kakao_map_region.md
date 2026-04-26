# Session 21: Kakao 지도 기반 지역 선택 + 실거래가 핀 표시

> **세션 목표**: ApartmentCard와 설정 페이지의 지역 드롭다운을 Kakao Maps 기반 지도 UI로 교체한다.
> 시군구 클릭으로 지역을 선택하고, 실거래가 데이터를 지도 핀으로 표시한다.
> **예상 소요**: 2~2.5시간
> **작업량 기준**: 프론트엔드 집중 세션 (백엔드 변경 없음)
> **브랜치**: `feat/kakao-map-region` (dev에서 분기)
> **선행 세션**: Session 20 + `feat/apartment-region-picker` 머지 완료 후 진행

---

## 선행 조건 확인

- `frontend/src/lib/regionList.ts` 에 시군구 코드 목록 있음 (Session 20.5에서 작성)
- `ApartmentCard.tsx` 에 `initialCode` prop + 연월 네비게이터 있음
- `settings/page.tsx` 에 지역 드롭다운 있음
- Kakao Developers 계정 및 JavaScript Key 발급 필요

---

## 환경 변수 추가

`.env.example` 및 `.env.local`:

```bash
# Kakao Maps
NEXT_PUBLIC_KAKAO_MAP_KEY=   # Kakao Developers JavaScript 앱 키
```

> `NEXT_PUBLIC_` prefix: 브라우저에서 직접 사용하는 공개 키. 지도 SDK 초기화에 필요.

---

## 꼭지 1: Kakao Maps SDK 로드 유틸리티

**파일**: `frontend/src/lib/kakaoMap.ts` (신규)

Kakao Maps JavaScript SDK는 `<script>` 태그로 로드해야 하며, 중복 로드를 방지한다.

```typescript
// frontend/src/lib/kakaoMap.ts
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: object) => KakaoMap;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        Marker: new (options: { position: KakaoLatLng; map?: KakaoMap }) => KakaoMarker;
        InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
        services: {
          Geocoder: new () => KakaoGeocoder;
        };
      };
    };
  }
  // 필요한 Kakao 타입들을 여기 추가
  type KakaoMap = { setCenter: (latlng: KakaoLatLng) => void; getLevel: () => number };
  type KakaoLatLng = { getLat: () => number; getLng: () => number };
  type KakaoMarker = { setMap: (map: KakaoMap | null) => void; getPosition: () => KakaoLatLng };
  type KakaoInfoWindow = { open: (map: KakaoMap, marker: KakaoMarker) => void; close: () => void };
  type KakaoGeocoder = { addressSearch: (addr: string, cb: (result: unknown[], status: string) => void) => void };
}

let loaded = false;
let loading = false;
const callbacks: Array<() => void> = [];

export function loadKakaoMap(): Promise<void> {
  return new Promise((resolve) => {
    if (loaded) { resolve(); return; }
    callbacks.push(resolve);
    if (loading) return;

    loading = true;
    const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY!;
    const script = document.createElement("script");
    // autoload=false: 수동으로 kakao.maps.load() 호출
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&libraries=services&autoload=false`;
    script.onload = () => {
      window.kakao.maps.load(() => {
        loaded = true;
        loading = false;
        callbacks.forEach((cb) => cb());
        callbacks.length = 0;
      });
    };
    document.head.appendChild(script);
  });
}
```

**완료 기준**
- [ ] `loadKakaoMap()` 두 번 호출해도 스크립트가 한 번만 삽입됨 확인
- [ ] `window.kakao.maps` 접근 가능 확인

**커밋**
```
feat(frontend): Kakao Maps SDK 로드 유틸리티 추가
```

---

## 꼭지 2: `RegionMapPicker` 컴포넌트 신설

지도를 표시하고 마커 클릭 또는 지역명 검색으로 법정동코드를 선택하는 재사용 컴포넌트.

**파일**: `frontend/src/components/map/RegionMapPicker.tsx` (신규)

### 동작 사양

1. 컴포넌트 마운트 시 Kakao Maps SDK 로드 → 지도 초기화
2. `initialCode` 가 있으면 해당 지역 중심으로 지도 이동 (Geocoder로 주소 검색)
3. REGION_LIST 의 각 항목을 마커로 표시 (너무 많으면 현재 보이는 구 기준 필터)
4. 마커 클릭 → `onSelect(regionOption)` 콜백 호출
5. 지도 위에 현재 선택 지역 표시 (InfoWindow)

### 인터페이스

```typescript
interface Props {
  initialCode?: string;
  onSelect: (region: RegionOption) => void;
  height?: string;   // CSS height, 기본값 "300px"
}
```

### 구현 포인트

```typescript
// 각 지역의 대표 좌표 (regionList에 lat/lng 추가 필요 → 꼭지 0에서 선행)
// 또는 Geocoder로 지역명 → 좌표 변환
```

> **주의**: Kakao Maps SDK는 서버 사이드 렌더링 불가. `"use client"` 필수.
> `useEffect` 안에서만 SDK 접근. Next.js hydration 에러 방지.

**완료 기준**
- [ ] 지도 렌더링 확인 (서울 중심 초기 표시)
- [ ] 마커 클릭 → onSelect 콜백 정상 호출 확인
- [ ] initialCode 있을 때 해당 지역 중심으로 이동 확인
- [ ] SSR 에러 없음 확인 (`npx tsc --noEmit`)

**커밋**
```
feat(frontend): RegionMapPicker 컴포넌트 신설 (Kakao Maps 기반)
```

---

## 꼭지 3: `regionList.ts` 에 대표 좌표 추가

RegionMapPicker의 마커 배치와 초기 지도 이동에 사용할 각 시군구의 중심 좌표.
Geocoder 실시간 변환 대신 정적 데이터로 성능 확보.

**파일**: `frontend/src/lib/regionList.ts` 수정

```typescript
export type RegionOption = {
  label: string;
  code: string;
  group: string;
  lat: number;   // 시군구 중심 위도
  lng: number;   // 시군구 중심 경도
};
```

서울 25개 구 + 주요 경기 도시 좌표를 추가한다.
좌표 참고: 행정안전부 공개 데이터 또는 Kakao 로컬 API.

예시:
```typescript
{ group: "서울", label: "서울 강남구", code: "11680", lat: 37.5172, lng: 127.0473 },
{ group: "서울", label: "서울 서초구", code: "11650", lat: 37.4837, lng: 127.0324 },
```

**완료 기준**
- [ ] REGION_LIST 전 항목에 lat/lng 포함 확인
- [ ] `npx tsc --noEmit` 통과

**커밋**
```
feat(frontend): regionList에 시군구 중심 좌표(lat/lng) 추가
```

---

## 꼭지 4: ApartmentCard — 드롭다운 → 지도 선택 교체

**파일**: `frontend/src/components/dashboard/ApartmentCard.tsx`

현재 `<select>` 드롭다운 → `RegionMapPicker` 로 교체.
카드 안에 지도를 접을 수 있게 (처음엔 접힌 상태, 지역명 클릭 시 펼쳐짐).

### UI 흐름

```
[서울 강남구 ✏️]          [< 2026년 3월 >]
─────────────────────── (지도 펼침 시)
[ Kakao 지도 — 마커 클릭으로 지역 선택 ]
[────────────────────────────────────]
거래 내역 목록
```

- 지역명 옆 ✏️(편집) 버튼 클릭 → 지도 표시
- 지도에서 마커 클릭 → 지역 선택 + 지도 접힘
- 선택 지역 없을 때: 지도 기본 표시 상태

**완료 기준**
- [ ] ✏️ 버튼 클릭 → 지도 패널 펼침/접힘 확인
- [ ] 지도 마커 클릭 → 지역 변경 + 데이터 재조회 확인
- [ ] 지도 접힌 상태에서 연월 네비게이터 정상 동작 확인

**커밋**
```
feat(frontend): ApartmentCard 지역 드롭다운 → Kakao 지도 선택으로 교체
```

---

## 꼭지 5: 설정 페이지 — 지역 드롭다운 → 지도 선택 교체

**파일**: `frontend/src/app/(app)/settings/page.tsx`

현재 `<select>` → `RegionMapPicker` 로 교체.

```tsx
{/* 기본 관심 지역 */}
<div className="mb-4">
  <p className="mb-2 text-sm font-medium text-[var(--color-text)]">기본 관심 지역</p>
  <RegionMapPicker
    initialCode={selectedRegion?.code}
    onSelect={(r) => setSelectedRegion(r)}
    height="240px"
  />
  {selectedRegion && (
    <p className="mt-2 text-xs text-[var(--color-text-sub)]">
      선택: {selectedRegion.label}
    </p>
  )}
</div>
```

**완료 기준**
- [ ] 설정 페이지 지도에서 지역 선택 → 저장 → 대시보드 카드 초기 지역 반영 확인
- [ ] 저장 Toast 정상 표시 확인
- [ ] 375px 모바일 지도 레이아웃 확인

**커밋**
```
feat(frontend): 설정 페이지 지역 선택 드롭다운 → Kakao 지도로 교체
```

---

## 꼭지 6: 실거래가 핀 지도 표시 (선택 사항 — 시간 여유 시)

`ApartmentCard`의 조회 결과를 지도 위 마커로 표시.
아파트 위치 → Geocoder로 좌표 변환 후 마커 표시.

> 좌표 변환 API 호출이 많을 수 있으므로 **최대 5개** 마커로 제한.

**완료 기준**
- [ ] 거래 목록 카드 클릭 → 해당 아파트 마커 강조 표시 확인

**커밋**
```
feat(frontend): 실거래가 결과 아파트 위치 핀 지도 표시
```

---

## 세션 완료 후

```bash
cd frontend && npm run build && npx tsc --noEmit

git push origin feat/kakao-map-region

gh pr create \
  --base dev \
  --title "[feat] Kakao 지도 기반 지역 선택 + 실거래가 핀 표시" \
  --body "$(cat <<'EOF'
## 개요
ApartmentCard와 설정 페이지의 지역 드롭다운을 Kakao Maps 기반 지도 UI로 교체한다.
시군구 마커 클릭으로 지역을 선택하고, 실거래가 데이터를 지도 핀으로 표시한다.

## 변경 사항
- [ ] frontend: Kakao Maps SDK 로드 유틸리티 (kakaoMap.ts)
- [ ] frontend: RegionMapPicker 컴포넌트 신설
- [ ] frontend: regionList.ts 좌표(lat/lng) 추가
- [ ] frontend: ApartmentCard 드롭다운 → 지도 선택
- [ ] frontend: settings 지역 드롭다운 → 지도 선택
- [ ] (선택) 실거래가 핀 지도 표시

## 테스트
- [ ] Kakao 지도 렌더링 확인 (SSR 에러 없음)
- [ ] 마커 클릭 지역 선택 → 실거래가 재조회 확인
- [ ] 설정 저장 → 대시보드 초기 지역 반영 확인
- [ ] 375px 모바일 지도 레이아웃 확인
- [ ] npm run build + npx tsc --noEmit 통과

## 체크리스트
- [ ] NEXT_PUBLIC_KAKAO_MAP_KEY 환경변수 .env.example 추가
- [ ] Type Hinting 적용
- [ ] logging 모듈 사용 (print 없음)
EOF
)"

gh pr merge <number> \
  --merge \
  --delete-branch \
  --subject "Merge pull request #N from 2nan22/feat/kakao-map-region" \
  --body "$(cat <<'EOF'
[feat] Kakao 지도 기반 지역 선택 + 실거래가 핀 표시

- Kakao Maps SDK 로드 유틸리티 (중복 로드 방지)
- RegionMapPicker: 시군구 마커 클릭으로 지역 선택
- regionList: lat/lng 좌표 추가
- ApartmentCard/settings: 드롭다운 → 지도 선택 교체
EOF
)"

git checkout dev && git pull origin dev
git branch -d feat/kakao-map-region

mv prompts/session_21_kakao_map_region.md prompts/_complete/
```

---

## 사전 준비 체크리스트

세션 시작 전 확인:

- [ ] Kakao Developers (developers.kakao.com) 에서 앱 생성
- [ ] JavaScript 앱 키 발급
- [ ] 플랫폼 → 웹 → `http://localhost:3000` 도메인 등록
- [ ] `.env.local` 에 `NEXT_PUBLIC_KAKAO_MAP_KEY=발급된_키` 추가
- [ ] Kakao Maps SDK 문서 확인: https://apis.map.kakao.com/web/documentation/

---

*작성일: 2026-04-25*
