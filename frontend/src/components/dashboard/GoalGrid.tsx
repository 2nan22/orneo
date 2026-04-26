// frontend/src/components/dashboard/GoalGrid.tsx
import LevelDots from "@/components/ui/LevelDots";
import Progress from "@/components/ui/Progress";
import { LEVEL_META, toLevel } from "@/lib/level";
import type { MeasureMode } from "@/components/ui/MeasurementToggle";
import type { ScoreDelta } from "@/lib/types";

interface GridItem {
  label: string;
  value: number;
  deltaKey: keyof ScoreDelta;
  icon: React.ReactNode;
}

interface Props {
  assetStability: number;
  goalProgress:   number;
  routineScore:   number;
  delta:          ScoreDelta | null;
  measureMode?:   MeasureMode;
}

function DeltaBadge({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral  = value === 0;
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

export default function GoalGrid({ assetStability, goalProgress, routineScore, delta, measureMode = "score" }: Props) {
  const items: GridItem[] = [
    {
      label: "자산 안정성",
      value: assetStability,
      deltaKey: "asset_stability",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[17px] w-[17px]"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-5" />
        </svg>
      ),
    },
    {
      label: "목표 진척",
      value: goalProgress,
      deltaKey: "goal_progress",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[17px] w-[17px]"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      ),
    },
    {
      label: "이번 주 루틴",
      value: routineScore,
      deltaKey: "routine_score",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-[17px] w-[17px]"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
             strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 6a3 3 0 0 1 5-2.2A3 3 0 0 1 18 6v1a3 3 0 0 1 1 5.8A3.5 3.5 0 0 1 15.5 18H15a3 3 0 0 1-6 0h-.5A3.5 3.5 0 0 1 5 12.8 3 3 0 0 1 6 7V6a2 2 0 0 1 2-2" />
          <path d="M12 4v16" /><path d="M8 10h3" /><path d="M13 14h3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const levelLabel = LEVEL_META[toLevel(item.value)].label;
        const levelCopy  = LEVEL_META[toLevel(item.value)].copy;

        return (
          <div
            key={item.label}
            className="flex flex-col rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-3 shadow-sm shadow-slate-200/70"
          >
            {/* 아이콘 래퍼 */}
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-2xl)] bg-slate-50 text-[#2563EB]">
              {item.icon}
            </div>

            {/* 레이블 */}
            <p className="text-[11px] font-bold text-slate-500">{item.label}</p>

            {/* 수치 + delta */}
            <div className="mt-1 flex items-end gap-1">
              <p className="text-2xl font-black tracking-[-0.06em] text-[#0B132B]">
                {measureMode === "score" ? `${Math.round(item.value)}` : levelLabel}
              </p>
              {delta !== null && <DeltaBadge value={delta[item.deltaKey]} />}
            </div>

            {/* 서브 카피 */}
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">
              {measureMode === "score" ? `${Math.round(item.value)}%` : levelCopy}
            </p>

            {/* Progress / LevelDots */}
            {measureMode === "score"
              ? <Progress value={item.value} className="mt-3" />
              : <LevelDots value={item.value} />
            }
          </div>
        );
      })}
    </div>
  );
}
