// frontend/src/app/api/public-data/dart/corps/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAiService } from "@/lib/ai-service";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") ?? "";
  if (!keyword) {
    return NextResponse.json({ status: "success", data: [] });
  }
  try {
    const data = await fetchAiService(
      `/public-data/dart/corps?keyword=${encodeURIComponent(keyword)}`,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "success", data: [] });
  }
}
