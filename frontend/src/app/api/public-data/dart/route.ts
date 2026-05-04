// frontend/src/app/api/public-data/dart/route.ts
import { NextRequest, NextResponse } from "next/server";

const AI_SERVICE_URL =
  process.env.AI_SERVICE_INTERNAL_URL ?? "http://ai_service:8001";
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET ?? "";

export async function GET(req: NextRequest) {
  const corp_code = req.nextUrl.searchParams.get("corp_code") ?? "";
  const corp_name = req.nextUrl.searchParams.get("corp_name") ?? "";
  if (!corp_code && !corp_name) {
    return NextResponse.json(
      { status: "error", message: "corp_name 또는 corp_code가 필요합니다.", data: [] },
      { status: 400 },
    );
  }

  const params = new URLSearchParams();
  if (corp_code) params.set("corp_code", corp_code);
  if (corp_name) params.set("corp_name", corp_name);

  let res: Response;
  try {
    res = await fetch(
      `${AI_SERVICE_URL}/public-data/dart/disclosures?${params.toString()}`,
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
    const detail = json?.detail ?? json?.message ?? `DART 조회 실패 (${res.status})`;
    return NextResponse.json(
      { status: "error", message: detail, data: [] },
      { status: res.status },
    );
  }
  return NextResponse.json(json);
}
