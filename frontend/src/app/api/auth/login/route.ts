import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  buildCookieHeader,
} from "@/lib/auth";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://backend:8000";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { status: "error", code: "INVALID_INPUT", message: "이메일과 비밀번호를 입력하세요." },
      { status: 400 },
    );
  }

  let djangoRes: Response;
  try {
    djangoRes = await fetch(`${DJANGO_URL}/api/v1/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
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
        code: data?.code ?? "AUTH_FAILED",
        message: data?.message ?? "로그인에 실패했습니다.",
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

  return res;
}
