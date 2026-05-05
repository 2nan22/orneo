// frontend/src/components/news/StockRecommendationChips.tsx
"use client";

import type { RecommendedStock } from "@/lib/types";

interface Props {
  stocks: RecommendedStock[];
  emptyText?: string;
  className?: string;
}

export default function StockRecommendationChips({
  stocks,
  emptyText = "추천 종목이 없습니다.",
  className = "",
}: Props) {
  if (stocks.length === 0) {
    return (
      <p className={`text-xs text-[var(--color-text-sub)] ${className}`}>
        {emptyText}
      </p>
    );
  }
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {stocks.map((s) => (
        <span
          key={s.ticker}
          className="rounded border border-[var(--color-border)] bg-white px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text)]"
          title={`${s.name} (${s.ticker})`}
        >
          {s.name}
        </span>
      ))}
    </div>
  );
}
