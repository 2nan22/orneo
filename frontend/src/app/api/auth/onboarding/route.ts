import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ONBOARDED_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  buildCookieHeader,
} from "@/lib/auth";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://backend:8000";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { status: "error", code: "UNAUTHORIZED", message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));

  let djangoRes: Response;
  try {
    djangoRes = await fetch(`${DJANGO_URL}/api/v1/auth/onboarding/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // 백엔드 연결 실패 시 온보딩 쿠키만 설정하고 성공 처리 (MVP 유연성)
    const res = NextResponse.json({ status: "success" });
    res.headers.append(
      "Set-Cookie",
      buildCookieHeader(ONBOARDED_COOKIE, "1", REFRESH_TOKEN_MAX_AGE),
    );
    return res;
  }

  if (!djangoRes.ok && djangoRes.status !== 409) {
    const data = await djangoRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        status: "error",
        code: data?.code ?? "ONBOARDING_FAILED",
        message: data?.message ?? "온보딩 저장에 실패했습니다.",
      },
      { status: djangoRes.status },
    );
  }

  // 성공 or 409(이미 온보딩) 모두 쿠키 설정
  const res = NextResponse.json({ status: "success" });
  res.headers.append(
    "Set-Cookie",
    buildCookieHeader(ONBOARDED_COOKIE, "1", REFRESH_TOKEN_MAX_AGE),
  );
  return res;
}
