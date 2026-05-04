// frontend/src/app/api/public-data/dart/corps/route.ts
import { NextRequest, NextResponse } from "next/server";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_INTERNAL_URL ?? "http://ai_service:8001";
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET ?? "";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") ?? "";
  if (!keyword) {
    return NextResponse.json({ status: "success", data: [] });
  }

  let res: Response;
  try {
    res = await fetch(
      `${AI_SERVICE_URL}/public-data/dart/corps?keyword=${encodeURIComponent(keyword)}`,
      {
        headers: { "X-Service-Secret": AI_SERVICE_SECRET },
        cache: "no-store",
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: `AI 서비스에 연결할 수 없습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
        data: [],
      },
      { status: 502 },
    );
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = json?.detail ?? json?.message ?? `DART 검색 실패 (${res.status})`;
    return NextResponse.json(
      { status: "error", message: detail, data: [] },
      { status: res.status },
    );
  }
  return NextResponse.json(json);
}
