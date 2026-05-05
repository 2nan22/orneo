// frontend/src/components/news/MarketToggle.tsx
"use client";

import type { MarketCode } from "@/lib/types";

interface Props {
  value: MarketCode;
  onChange: (next: MarketCode) => void;
  className?: string;
}

const MARKETS: { code: MarketCode; label: string }[] = [
  { code: "KR", label: "🇰🇷 한국 시장" },
  { code: "US", label: "🇺🇸 미국 시장" },
];

export default function MarketToggle({
  value,
  onChange,
  className = "",
}: Props) {
  return (
    <div
      role="tablist"
      aria-label="시장 선택"
      className={`flex self-start rounded-lg border border-[var(--color-border)] bg-white p-1 shadow-sm ${className}`}
    >
      {MARKETS.map((m) => {
        const active = value === m.code;
        return (
          <button
            key={m.code}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.code)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-[var(--color-text)] text-white"
                : "text-[var(--color-text-sub)] hover:text-[var(--color-text)]"
            }`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
