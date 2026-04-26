// frontend/src/components/journal/CategoryTabs.tsx
"use client";

import type { JournalCategory } from "@/lib/types";

export type CategoryFilter = JournalCategory | "all";

const TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "investment", label: "투자" },
  { value: "housing", label: "주거" },
  { value: "learning", label: "학습" },
  { value: "routine", label: "루틴" },
];

interface Props {
  active: CategoryFilter;
  onChange: (category: CategoryFilter) => void;
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={[
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            active === value
              ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] text-white"
              : "bg-[var(--color-card)] text-[var(--color-text-sub)] hover:bg-[var(--color-border)]",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
