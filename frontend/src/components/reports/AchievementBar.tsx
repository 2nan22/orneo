// frontend/src/components/reports/AchievementBar.tsx

interface Props {
  label: string;
  value: number;
  unit?: string;
}

export default function AchievementBar({ label, value, unit = "%" }: Props) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 70 ? "#00C2A8" : clamped >= 40 ? "#2563EB" : "#F59E0B";

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-[var(--color-text-sub)]">{label}</span>
      <div className="flex-1 rounded-full bg-[var(--color-border)] h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-semibold text-[var(--color-text)]">
        {unit === "%" ? `${Math.round(value)}%` : `${value}${unit}`}
      </span>
    </div>
  );
}
