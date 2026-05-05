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
      className={`flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 text-left transition-shadow hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-[var(--color-text)]">
          {sector.sector_name_ko}
        </span>
        <span className="text-[10px] text-[var(--color-text-sub)]">
          {sector.article_count}건
        </span>
      </div>
      <SignalIndicator signal={sector.investment_signal} size="sm" />
      <StockRecommendationChips
        stocks={sector.recommended_stocks}
        emptyText="—"
      />
    </button>
  );
}
