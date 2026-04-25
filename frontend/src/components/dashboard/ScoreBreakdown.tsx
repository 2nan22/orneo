// frontend/src/components/dashboard/ScoreBreakdown.tsx
"use client";

interface AxisBar {
  label: string;
  value: number;
}

interface Props {
  asset_stability: number;
  goal_progress: number;
  routine_score: number;
}

function Bar({ label, value }: AxisBar) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--color-text-sub)]">{label}</span>
        <span className="font-semibold text-[var(--color-text)]">{value === 0 ? "—" : `${value}`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: "var(--color-point)" }}
        />
      </div>
    </div>
  );
}

export default function ScoreBreakdown({ asset_stability, goal_progress, routine_score }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Bar label="자산 안정성" value={asset_stability} />
      <Bar label="목표 진척도" value={goal_progress} />
      <Bar label="루틴 점수" value={routine_score} />
    </div>
  );
}
