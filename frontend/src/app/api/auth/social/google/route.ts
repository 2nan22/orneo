import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  ONBOARDED_COOKIE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  buildCookieHeader,
} from "@/lib/auth";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://backend:8000";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/auth/callback/google`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.code) {
    return NextResponse.json(
      { status: "error", code: "INVALID_INPUT", message: "인증 코드가 없습니다." },
      { status: 400 },
    );
  }

  let djangoRes: Response;
  try {
    djangoRes = await fetch(`${DJANGO_URL}/api/v1/auth/social/google/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: body.code, redirect_uri: REDIRECT_URI }),
    });
  } catch {
    return NextResponse.json(
      { status: "error", code: "SERVICE_UNAVAILABLE", message: "서버에 연결할 수 없습니다." },
      { status: 503 },
    );
  }

  const data = await djangoRes.json();

  if (!djangoRes.ok) {
    return NextResponse.json(
      {
        status: "error",
        code: data?.code ?? "SOCIAL_LOGIN_FAILED",
        message: data?.message ?? data?.non_field_errors?.[0] ?? "소셜 로그인에 실패했습니다.",
      },
      { status: djangoRes.status },
    );
  }

  const res = NextResponse.json({ status: "success" });

  res.headers.append(
    "Set-Cookie",
    buildCookieHeader(ACCESS_TOKEN_COOKIE, data.access, ACCESS_TOKEN_MAX_AGE),
  );
  if (data.refresh) {
    res.headers.append(
      "Set-Cookie",
      buildCookieHeader(REFRESH_TOKEN_COOKIE, data.refresh, REFRESH_TOKEN_MAX_AGE),
    );
  }

  // 프로필로 온보딩 완료 여부 확인
  try {
    const profileRes = await fetch(`${DJANGO_URL}/api/v1/auth/profile/`, {
      headers: { Authorization: `Bearer ${data.access}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      const onboardedAt = profile?.data?.onboarded_at ?? profile?.onboarded_at;
      if (onboardedAt) {
        res.headers.append(
          "Set-Cookie",
          buildCookieHeader(ONBOARDED_COOKIE, "1", REFRESH_TOKEN_MAX_AGE),
        );
      }
    }
  } catch {
    // 프로필 조회 실패는 무시
  }

  return res;
}
