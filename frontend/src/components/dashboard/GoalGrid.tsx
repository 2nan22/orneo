// frontend/src/components/dashboard/GoalGrid.tsx
import type { ScoreDelta } from "@/lib/types";

interface GridItem {
  label: string;
  value: number;
  deltaKey: keyof ScoreDelta;
  icon: React.ReactNode;
}

interface Props {
  assetStability: number;
  goalProgress: number;
  routineScore: number;
  delta: ScoreDelta | null;
}

function DeltaBadge({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <span
      className={[
        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        isNeutral
          ? "bg-[var(--color-bg)] text-[var(--color-text-sub)]"
          : isPositive
            ? "bg-[var(--color-point-light)] text-[var(--color-point)]"
            : "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
      ].join(" ")}
    >
      {isPositive ? `+${value}` : `${value}`}
    </span>
  );
}

export default function GoalGrid({ assetStability, goalProgress, routineScore, delta }: Props) {
  const items: GridItem[] = [
    {
      label: "자산 안정성",
      value: assetStability,
      deltaKey: "asset_stability",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      ),
    },
    {
      label: "목표 진척",
      value: goalProgress,
      deltaKey: "goal_progress",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      label: "이번 주 루틴",
      value: routineScore,
      deltaKey: "routine_score",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 rounded-[var(--radius-lg)] bg-[var(--color-bg)] px-3 py-3"
        >
          <span className="text-[var(--color-text-sub)]">{item.icon}</span>
          <div className="flex items-end gap-1">
            <span className="text-lg font-bold text-[var(--color-text)]">
              {Math.round(item.value)}
            </span>
            {delta !== null && <DeltaBadge value={delta[item.deltaKey]} />}
          </div>
          <span className="text-[10px] text-[var(--color-text-sub)]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
