// frontend/e2e/navigation.spec.ts
import { test, expect } from "@playwright/test";

// 로그인이 필요한 테스트는 CI에서 Mock 세션 또는 테스트 계정 사용
// 이 파일은 공개 페이지(로그인 전) 기본 렌더링만 검증
test.describe("공개 페이지 렌더링", () => {
  test("로그인 페이지 — 브랜드 요소 표시", async ({ page }) => {
    await page.goto("/login");

    // heading으로 ORNEO 브랜드 확인
    await expect(page.getByRole("heading", { name: "ORNEO" })).toBeVisible();
    // 슬로건 확인
    await expect(page.getByText(/오늘의 선택/)).toBeVisible();
  });

  test("모바일 375px — 가로 스크롤 없음", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");

    // 가로 스크롤 없음 확인
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
