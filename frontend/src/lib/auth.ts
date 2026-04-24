export const ACCESS_TOKEN_COOKIE = "orneo_access";
export const REFRESH_TOKEN_COOKIE = "orneo_refresh";

/** 쿠키 maxAge (초) */
export const ACCESS_TOKEN_MAX_AGE = 60 * 60;        // 1h
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7d

/** httpOnly 쿠키 옵션 문자열 빌더 */
export function buildCookieHeader(name: string, value: string, maxAge: number): string {
  return [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

/** 쿠키 삭제용 헤더 빌더 (Max-Age=0) */
export function buildClearCookieHeader(name: string): string {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
