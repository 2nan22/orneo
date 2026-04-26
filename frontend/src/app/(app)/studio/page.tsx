// frontend/src/app/(app)/studio/page.tsx
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";

export default function StudioPage() {
  return (
    <PageContainer size="md">
      <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">DECISION STUDIO</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">
        선택을 시뮬레이션하세요
      </h1>
      <p className="mt-2 text-sm text-[#334155]">
        돈, 시간, 집중력, 커리어 성장을 함께 비교해요.<br />
        ORNEO AI가 필요한 도구와 데이터를 조합합니다.
      </p>
      <Card variant="outlined" className="mt-6 py-12 text-center">
        <p className="text-sm text-[var(--color-text-sub)]">Studio 화면 준비 중 — Session 23에서 구현</p>
      </Card>
    </PageContainer>
  );
}
