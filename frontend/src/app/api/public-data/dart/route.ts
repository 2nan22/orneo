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
