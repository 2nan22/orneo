// frontend/src/app/api/public-data/kmooc/route.ts
import { NextRequest, NextResponse } from "next/server";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://backend:8000";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") ?? "";
  if (!keyword) {
    return NextResponse.json({ status: "success", data: [] });
  }
  try {
    const res = await fetch(
      `${DJANGO_URL}/api/v1/public-data/kmooc/courses/?keyword=${encodeURIComponent(keyword)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return NextResponse.json({ status: "success", data: [] });
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ status: "success", data: [] });
  }
}
