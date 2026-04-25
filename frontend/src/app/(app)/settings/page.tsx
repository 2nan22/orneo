// frontend/src/app/(app)/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <PageContainer size="sm">
      <h1 className="mb-6 text-[22px] font-bold text-[var(--color-text)]">설정</h1>

      {/* 프로필 섹션 (placeholder) */}
      <Card className="mb-4">
        <p className="text-sm font-semibold text-[var(--color-text)]">프로필</p>
        <p className="mt-2 text-sm text-[var(--color-text-sub)]">
          프로필 설정 기능은 준비 중입니다.
        </p>
      </Card>

      {/* 계정 — 로그아웃 */}
      <Card variant="outlined">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">계정</p>
        <Button
          variant="danger"
          size="md"
          fullWidth
          onClick={handleLogout}
        >
          로그아웃
        </Button>
      </Card>
    </PageContainer>
  );
}
