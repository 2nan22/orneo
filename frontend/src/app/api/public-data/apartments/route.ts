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
    return NextResponse.json({ status: "success", data: [] });
  }
}
