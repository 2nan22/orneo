// frontend/src/app/api/public-data/apartments/route.ts
import { NextRequest, NextResponse } from "next/server";

const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY ?? "";
const MOLIT_BASE  = "https://apis.data.go.kr/1613000";

const SERVICE_MAP = {
  apt:  "RTMSDataSvcAptTradeDev",
  offi: "RTMSDataSvcOffiTradeDev",
  rh:   "RTMSDataSvcRHTradeDev",
  sh:   "RTMSDataSvcSHTradeDev",
} as const;
type PropertyType = keyof typeof SERVICE_MAP;

const ROWS_PER_PAGE = 10;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lawd_cd  = searchParams.get("lawd_cd");
  const deal_ymd = searchParams.get("deal_ymd");
  const typeParam = searchParams.get("type") ?? "apt";
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  if (!lawd_cd || !deal_ymd) {
    return NextResponse.json(
      { status: "error", message: "lawd_cd, deal_ymd 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  if (!SERVICE_KEY) {
    return NextResponse.json(
      { status: "error", message: "DATA_GO_KR_SERVICE_KEY가 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const propertyType: PropertyType = (typeParam in SERVICE_MAP)
    ? (typeParam as PropertyType)
    : "apt";
  const serviceName = SERVICE_MAP[propertyType];

  // 서비스 키는 base64 raw 값(+, = 포함)이므로 encodeURIComponent 필수.
  // URLSearchParams에 넣으면 + → %2B → 다시 %252B 이중 인코딩 발생.
  const otherParams = new URLSearchParams({
    LAWD_CD:   lawd_cd,
    DEAL_YMD:  deal_ymd,
    numOfRows: String(ROWS_PER_PAGE),
    pageNo:    String(pageParam),
  });
  const fullUrl =
    `${MOLIT_BASE}/${serviceName}/get${serviceName}?serviceKey=${encodeURIComponent(SERVICE_KEY)}&${otherParams.toString()}`;

  try {
    const res  = await fetch(fullUrl, { cache: "no-store" });
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { status: "error", message: `MOLIT API 오류: ${res.status}` },
        { status: 502 },
      );
    }

    // 이 API는 항상 XML을 반환한다 (resultType=json 파라미터 무시됨)
    const resultCode = text.match(/<resultCode>(.*?)<\/resultCode>/)?.[1];
    if (resultCode && resultCode !== "000") {
      const resultMsg = text.match(/<resultMsg>(.*?)<\/resultMsg>/)?.[1];
      return NextResponse.json(
        { status: "error", message: `MOLIT API 오류 (${resultCode}): ${resultMsg ?? "알 수 없는 오류"}` },
        { status: 502 },
      );
    }

    const totalCount = parseInt(
      text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? "0",
      10,
    );

    // XML <item> 블록을 파싱해 필드 맵 배열로 변환
    const items: Record<string, string>[] = [];
    const itemPattern = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch;
    while ((itemMatch = itemPattern.exec(text)) !== null) {
      const fieldMap: Record<string, string> = {};
      const fieldPattern = /<([^/>\s]+)>([^<]*)<\/\1>/g;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(itemMatch[1])) !== null) {
        fieldMap[fieldMatch[1]] = fieldMatch[2];
      }
      items.push(fieldMap);
    }

    const data = items
      .map((item) => {
        try {
          return {
            deal_amount:    parseInt((item.dealAmount ?? "0").replace(/,/g, ""), 10),
            // 단독·다가구는 totalFloorAr(연면적) 사용, 나머지는 excluUseAr(전용면적)
            area:           parseFloat(item.excluUseAr ?? item.totalFloorAr ?? "0"),
            floor:          parseInt(item.floor ?? "0", 10),
            deal_date:      `${item.dealYear}-${(item.dealMonth ?? "1").padStart(2, "0")}-${(item.dealDay ?? "1").padStart(2, "0")}`,
            // 유형별 건물명 필드: 아파트→aptNm, 오피스텔→offiNm, 연립→mhouseNm, 단독→houseType
            apartment_name: item.aptNm ?? item.offiNm ?? item.mhouseNm ?? item.houseType ?? "",
            road_name:      item.roadNm ?? "",
            legal_dong:     item.umdNm ?? "",
            build_year:     parseInt(item.buildYear ?? "0", 10),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ status: "success", data, page: pageParam, total_count: totalCount });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: `조회 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}` },
      { status: 502 },
    );
  }
}
