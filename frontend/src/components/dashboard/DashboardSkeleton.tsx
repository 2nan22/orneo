// frontend/src/components/dashboard/DashboardSkeleton.tsx

export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {/* 오늘 할 행동 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-44" />
      {/* 오늘의 핵심 질문 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-24" />
      {/* 라이프 캐피털 점수 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-52" />
      {/* 빠른 진입 skeleton */}
      <div className="rounded-[var(--radius-xl)] bg-[var(--color-border)] h-20" />
    </div>
  );
}
