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
  const barH = size === "sm" ? "h-1" : "h-1.5";
  const labelText = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between gap-2">
          <span className={`font-bold ${labelText}`} style={{ color }}>
            {label}
          </span>
          <span className={`${labelText} text-[var(--color-text-sub)]`}>
            {signal}/5
          </span>
        </div>
      )}
      <div className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${barH}`}
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
