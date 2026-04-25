import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ONBOARDED_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildClearCookieHeader,
} from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ status: "success" });
  res.headers.append("Set-Cookie", buildClearCookieHeader(ACCESS_TOKEN_COOKIE));
  res.headers.append("Set-Cookie", buildClearCookieHeader(REFRESH_TOKEN_COOKIE));
  res.headers.append("Set-Cookie", buildClearCookieHeader(ONBOARDED_COOKIE));
  return res;
}
