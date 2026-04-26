// frontend/e2e/onboarding.spec.ts
import { test, expect } from "@playwright/test";

test.describe("온보딩 페이지", () => {
  test("미인증 사용자가 /onboarding 접근 시 /login으로 리다이렉트", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    // proxy.ts 미들웨어: 비로그인 → protected 경로 → /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("로그인 페이지 — 소셜 로그인 UI 표시", async ({ page }) => {
    await page.goto("/login");

    // 소셜 로그인 제목 확인
    await expect(page.getByText("시작하기")).toBeVisible();
    // Google 버튼 존재 확인
    await expect(page.getByText(/Google로 계속하기/)).toBeVisible();
    // 카카오 버튼 존재 확인 (준비 중)
    await expect(page.getByText(/카카오로 계속하기/)).toBeVisible();
  });
});
