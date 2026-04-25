// frontend/src/app/api/v1/[...path]/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://localhost:8000";

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const djangoPath = path.join("/");
  const search = req.nextUrl.search;
  const djangoUrl = `${DJANGO_URL}/api/v1/${djangoPath}/${search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  let djangoRes: Response;
  try {
    djangoRes = await fetch(djangoUrl, init);
  } catch {
    return NextResponse.json(
      { status: "error", code: "SERVICE_UNAVAILABLE", message: "백엔드 서버에 연결할 수 없습니다." },
      { status: 503 },
    );
  }

  const data = await djangoRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: djangoRes.status });
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
