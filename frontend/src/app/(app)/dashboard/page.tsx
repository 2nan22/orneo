import Card from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">라이프 캐피털 대시보드</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--color-text-sub)]">자산 안정성</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-primary)]">—</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-sub)]">목표 진척도</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-primary)]">—</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-sub)]">루틴 점수</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-primary)]">—</p>
        </Card>
      </div>
    </div>
  );
}
