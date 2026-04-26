// frontend/src/app/(app)/finance/page.tsx
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";

export default function FinancePage() {
  return (
    <PageContainer size="md">
      <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">FINANCE INTELLIGENCE</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">
        금융 정보를 종합합니다
      </h1>
      <p className="mt-2 text-sm text-[#334155]">
        주식, 부동산, 금리, 환율, 공시를 함께 봅니다.
      </p>
      <Card variant="outlined" className="mt-6 py-12 text-center">
        <p className="text-sm text-[var(--color-text-sub)]">Finance 화면 준비 중 — Session 23에서 구현</p>
      </Card>
    </PageContainer>
  );
}
