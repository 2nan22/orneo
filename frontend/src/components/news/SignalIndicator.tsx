// frontend/src/components/news/SignalIndicator.tsx
"use client";

import type { InvestmentSignal } from "@/lib/types";

const SIGNAL_LABELS: Record<InvestmentSignal, string> = {
  1: "적극 매도",
  2: "비중 축소",
  3: "중립",
  4: "비중 확대",
  5: "적극 매수",
};

const SIGNAL_VAR: Record<InvestmentSignal, string> = {
  1: "var(--color-signal-1)",
  2: "var(--color-signal-2)",
  3: "var(--color-signal-3)",
  4: "var(--color-signal-4)",
  5: "var(--color-signal-5)",
};

interface Props {
  signal: InvestmentSignal;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export default function SignalIndicator({
  signal,
  size = "md",
  showLabel = true,
  className = "",
}: Props) {
  const color = SIGNAL_VAR[signal];
  const label = SIGNAL_LABELS[signal];
  const labelText = size === "sm" ? "text-[10px]" : "text-[11px]";
  const barH = size === "sm" ? "h-2" : "h-2.5";
  const barW = size === "sm" ? "w-1" : "w-1.5";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className={`font-extrabold ${labelText}`} style={{ color }}>
          {label}
        </span>
      )}
      <div className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`rounded-sm ${barH} ${barW}`}
            style={{
              backgroundColor:
                i <= signal ? color : "var(--color-border)",
              opacity: i <= signal ? 1 : 0.5,
            }}
          />
        ))}
      </div>
    </div>
  );
}
