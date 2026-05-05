// frontend/src/components/news/SectorSignalCard.tsx
"use client";

import SignalIndicator from "@/components/news/SignalIndicator";
import StockRecommendationChips from "@/components/news/StockRecommendationChips";
import type { NewsSectorAnalysis } from "@/lib/types";

interface Props {
  sector: NewsSectorAnalysis;
  onClick?: () => void;
  className?: string;
}

export default function SectorSignalCard({
  sector,
  onClick,
  className = "",
}: Props) {
  const isEmpty = sector.article_count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isEmpty}
      className={`flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-3 text-left shadow-sm transition-colors hover:border-[var(--color-slate-500)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
        <span className="text-[13px] font-extrabold text-[var(--color-text)]">
          {sector.sector_name_ko}
        </span>
        <SignalIndicator signal={sector.investment_signal} size="sm" />
      </div>
      <StockRecommendationChips
        stocks={sector.recommended_stocks}
        emptyText="—"
        className="pt-0.5"
      />
    </button>
  );
}
