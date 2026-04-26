// frontend/src/app/api/public-data/dart/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAiService } from "@/lib/ai-service";

export async function GET(req: NextRequest) {
  const corp_code = req.nextUrl.searchParams.get("corp_code") ?? "";
  const corp_name = req.nextUrl.searchParams.get("corp_name") ?? "";
  if (!corp_code && !corp_name) {
    return NextResponse.json({ status: "success", data: [] });
  }
  try {
    const params = new URLSearchParams();
    if (corp_code) params.set("corp_code", corp_code);
    if (corp_name) params.set("corp_name", corp_name);
    const data = await fetchAiService(`/public-data/dart/disclosures?${params.toString()}`);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "success", data: [] });
  }
}
