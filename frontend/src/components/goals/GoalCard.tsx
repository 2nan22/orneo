// frontend/src/components/goals/GoalCard.tsx
import Card from "@/components/ui/Card";
import type { Goal, GoalCategory } from "@/lib/types";

const CATEGORY_META: Record<GoalCategory, { label: string; icon: string; color: string }> = {
  finance: { label: "금융", icon: "💰", color: "bg-blue-100 text-blue-700" },
  housing: { label: "주거", icon: "🏠", color: "bg-green-100 text-green-700" },
  learning: { label: "학습", icon: "📚", color: "bg-purple-100 text-purple-700" },
  routine: { label: "루틴", icon: "⚡", color: "bg-orange-100 text-orange-700" },
};

interface GoalCardProps {
  goal: Goal;
}

export default function GoalCard({ goal }: GoalCardProps) {
  const meta = CATEGORY_META[goal.category] ?? {
    label: goal.category,
    icon: "🎯",
    color: "bg-gray-100 text-gray-700",
  };

  const isOverdue =
    goal.target_date != null &&
    goal.progress < 1 &&
    new Date(goal.target_date) < new Date();

  const progressPct = Math.min(Math.round(goal.progress * 100), 100);

  return (
    <Card as="article" padding="lg" className="transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          {isOverdue && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
              기한 초과
            </span>
          )}
        </div>
        {goal.target_date && (
          <span className="shrink-0 text-xs text-[var(--color-text-sub)]">
            {new Date(goal.target_date).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      <h3 className="mb-3 font-semibold text-[var(--color-text)]">{goal.title}</h3>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: "var(--color-point)",
            }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-sm font-semibold text-[var(--color-text)]">
          {progressPct}%
        </span>
      </div>
    </Card>
  );
}
