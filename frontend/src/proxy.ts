import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, ONBOARDED_COOKIE } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/journal", "/goals", "/reports", "/onboarding"];
const AUTH_PATHS = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasToken = !!req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isOnboarded = !!req.cookies.get(ONBOARDED_COOKIE)?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAuthPath = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // 비로그인 → 보호 경로 접근 시 /login으로
  if (isProtected && !hasToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 로그인 O + 온보딩 미완료 → /onboarding 이외 보호 경로 접근 시 /onboarding으로
  if (hasToken && !isOnboarded && isProtected && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // 로그인 O + 온보딩 완료 → /onboarding 재접근 시 /dashboard로
  if (hasToken && isOnboarded && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 로그인 O → /login, /register 접근 시 /dashboard로
  if (hasToken && isAuthPath) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)", "/_next/data/(.*)"],
};
