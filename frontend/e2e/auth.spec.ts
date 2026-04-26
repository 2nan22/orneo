// frontend/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("인증 플로우", () => {
  test("로그인 페이지 렌더링 — 브랜드 및 소셜 버튼 표시", async ({ page }) => {
    await page.goto("/login");

    // heading으로 ORNEO 브랜드 확인 (약관 문구 중복 방지)
    await expect(page.getByRole("heading", { name: "ORNEO" })).toBeVisible();
    // Google 로그인 버튼 존재 확인
    await expect(page.getByText(/Google로 계속하기/)).toBeVisible();
  });

  test("미인증 사용자가 / 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/");
    // root → /dashboard → (middleware) → /login (비인증)
    await expect(page).toHaveURL(/\/login/);
  });
});
