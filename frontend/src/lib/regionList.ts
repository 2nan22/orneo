// frontend/src/lib/regionList.ts

export type RegionOption = {
  /** 드롭다운 표시 + preferred_region 저장값 (예: "서울 강남구") */
  label: string;
  /** MOLIT API lawd_cd (5자리) */
  code: string;
  /** optgroup 묶음 */
  group: string;
};

export const REGION_LIST: RegionOption[] = [
  // ── 서울 ──────────────────────────────────────────────
  { group: "서울", label: "서울 종로구",   code: "11110" },
  { group: "서울", label: "서울 중구",     code: "11140" },
  { group: "서울", label: "서울 용산구",   code: "11170" },
  { group: "서울", label: "서울 성동구",   code: "11200" },
  { group: "서울", label: "서울 광진구",   code: "11215" },
  { group: "서울", label: "서울 동대문구", code: "11230" },
  { group: "서울", label: "서울 중랑구",   code: "11260" },
  { group: "서울", label: "서울 성북구",   code: "11290" },
  { group: "서울", label: "서울 강북구",   code: "11305" },
  { group: "서울", label: "서울 도봉구",   code: "11320" },
  { group: "서울", label: "서울 노원구",   code: "11350" },
  { group: "서울", label: "서울 은평구",   code: "11380" },
  { group: "서울", label: "서울 서대문구", code: "11410" },
  { group: "서울", label: "서울 마포구",   code: "11440" },
  { group: "서울", label: "서울 양천구",   code: "11470" },
  { group: "서울", label: "서울 강서구",   code: "11500" },
  { group: "서울", label: "서울 구로구",   code: "11530" },
  { group: "서울", label: "서울 금천구",   code: "11545" },
  { group: "서울", label: "서울 영등포구", code: "11560" },
  { group: "서울", label: "서울 동작구",   code: "11590" },
  { group: "서울", label: "서울 관악구",   code: "11620" },
  { group: "서울", label: "서울 서초구",   code: "11650" },
  { group: "서울", label: "서울 강남구",   code: "11680" },
  { group: "서울", label: "서울 송파구",   code: "11710" },
  { group: "서울", label: "서울 강동구",   code: "11740" },

  // ── 경기 ──────────────────────────────────────────────
  { group: "경기", label: "수원 장안구",   code: "41111" },
  { group: "경기", label: "수원 권선구",   code: "41113" },
  { group: "경기", label: "수원 팔달구",   code: "41115" },
  { group: "경기", label: "수원 영통구",   code: "41117" },
  { group: "경기", label: "성남 수정구",   code: "41131" },
  { group: "경기", label: "성남 중원구",   code: "41133" },
  { group: "경기", label: "성남 분당구",   code: "41135" },
  { group: "경기", label: "의정부시",      code: "41150" },
  { group: "경기", label: "안양 만안구",   code: "41171" },
  { group: "경기", label: "안양 동안구",   code: "41173" },
  { group: "경기", label: "부천시",        code: "41190" },
  { group: "경기", label: "광명시",        code: "41210" },
  { group: "경기", label: "평택시",        code: "41220" },
  { group: "경기", label: "안산 단원구",   code: "41271" },
  { group: "경기", label: "안산 상록구",   code: "41273" },
  { group: "경기", label: "고양 덕양구",   code: "41281" },
  { group: "경기", label: "고양 일산동구", code: "41285" },
  { group: "경기", label: "고양 일산서구", code: "41287" },
  { group: "경기", label: "과천시",        code: "41290" },
  { group: "경기", label: "구리시",        code: "41310" },
  { group: "경기", label: "남양주시",      code: "41360" },
  { group: "경기", label: "오산시",        code: "41370" },
  { group: "경기", label: "시흥시",        code: "41390" },
  { group: "경기", label: "군포시",        code: "41410" },
  { group: "경기", label: "의왕시",        code: "41430" },
  { group: "경기", label: "하남시",        code: "41450" },
  { group: "경기", label: "용인 처인구",   code: "41461" },
  { group: "경기", label: "용인 기흥구",   code: "41463" },
  { group: "경기", label: "용인 수지구",   code: "41465" },
  { group: "경기", label: "파주시",        code: "41480" },
  { group: "경기", label: "이천시",        code: "41500" },
  { group: "경기", label: "안성시",        code: "41550" },
  { group: "경기", label: "김포시",        code: "41570" },
  { group: "경기", label: "화성시",        code: "41590" },
  { group: "경기", label: "광주시",        code: "41610" },
  { group: "경기", label: "양주시",        code: "41630" },

  // ── 인천 ──────────────────────────────────────────────
  { group: "인천", label: "인천 중구",     code: "28110" },
  { group: "인천", label: "인천 동구",     code: "28140" },
  { group: "인천", label: "인천 미추홀구", code: "28177" },
  { group: "인천", label: "인천 연수구",   code: "28185" },
  { group: "인천", label: "인천 남동구",   code: "28200" },
  { group: "인천", label: "인천 부평구",   code: "28237" },
  { group: "인천", label: "인천 계양구",   code: "28245" },
  { group: "인천", label: "인천 서구",     code: "28260" },

  // ── 부산 ──────────────────────────────────────────────
  { group: "부산", label: "부산 중구",     code: "26110" },
  { group: "부산", label: "부산 서구",     code: "26140" },
  { group: "부산", label: "부산 동구",     code: "26170" },
  { group: "부산", label: "부산 영도구",   code: "26200" },
  { group: "부산", label: "부산 부산진구", code: "26230" },
  { group: "부산", label: "부산 동래구",   code: "26260" },
  { group: "부산", label: "부산 남구",     code: "26290" },
  { group: "부산", label: "부산 북구",     code: "26320" },
  { group: "부산", label: "부산 해운대구", code: "26350" },
  { group: "부산", label: "부산 사하구",   code: "26380" },
  { group: "부산", label: "부산 금정구",   code: "26410" },
  { group: "부산", label: "부산 연제구",   code: "26470" },
  { group: "부산", label: "부산 수영구",   code: "26500" },
  { group: "부산", label: "부산 사상구",   code: "26530" },

  // ── 대구 ──────────────────────────────────────────────
  { group: "대구", label: "대구 중구",     code: "27110" },
  { group: "대구", label: "대구 동구",     code: "27140" },
  { group: "대구", label: "대구 서구",     code: "27170" },
  { group: "대구", label: "대구 남구",     code: "27200" },
  { group: "대구", label: "대구 북구",     code: "27230" },
  { group: "대구", label: "대구 수성구",   code: "27260" },
  { group: "대구", label: "대구 달서구",   code: "27290" },

  // ── 광주 ──────────────────────────────────────────────
  { group: "광주", label: "광주 동구",     code: "29110" },
  { group: "광주", label: "광주 서구",     code: "29140" },
  { group: "광주", label: "광주 남구",     code: "29155" },
  { group: "광주", label: "광주 북구",     code: "29170" },
  { group: "광주", label: "광주 광산구",   code: "29200" },

  // ── 대전 ──────────────────────────────────────────────
  { group: "대전", label: "대전 동구",     code: "30110" },
  { group: "대전", label: "대전 중구",     code: "30140" },
  { group: "대전", label: "대전 서구",     code: "30170" },
  { group: "대전", label: "대전 유성구",   code: "30200" },
  { group: "대전", label: "대전 대덕구",   code: "30230" },

  // ── 울산 ──────────────────────────────────────────────
  { group: "울산", label: "울산 중구",     code: "31110" },
  { group: "울산", label: "울산 남구",     code: "31140" },
  { group: "울산", label: "울산 동구",     code: "31170" },
  { group: "울산", label: "울산 북구",     code: "31200" },

  // ── 세종 ──────────────────────────────────────────────
  { group: "세종", label: "세종시",        code: "36110" },

  // ── 창원 ──────────────────────────────────────────────
  { group: "창원", label: "창원 의창구",   code: "48121" },
  { group: "창원", label: "창원 성산구",   code: "48123" },
  { group: "창원", label: "창원 마산합포구", code: "48125" },
  { group: "창원", label: "창원 마산회원구", code: "48127" },
  { group: "창원", label: "창원 진해구",   code: "48129" },

  // ── 청주 ──────────────────────────────────────────────
  { group: "청주", label: "청주 상당구",   code: "43111" },
  { group: "청주", label: "청주 서원구",   code: "43113" },
  { group: "청주", label: "청주 흥덕구",   code: "43115" },
  { group: "청주", label: "청주 청원구",   code: "43117" },

  // ── 전주 ──────────────────────────────────────────────
  { group: "전주", label: "전주 완산구",   code: "45111" },
  { group: "전주", label: "전주 덕진구",   code: "45113" },
];

/** code → RegionOption 빠른 조회 */
export const REGION_MAP = new Map<string, RegionOption>(
  REGION_LIST.map((r) => [r.code, r]),
);

/** group 목록 (순서 유지) */
export const REGION_GROUPS = [...new Set(REGION_LIST.map((r) => r.group))];
