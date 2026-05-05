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

// Canvas 레퍼런스와 동일한 hex 직값. Tailwind v4 의 @theme inline 블록에 시그널
// 토큰이 등록되지 않아 inline style 의 var(--color-signal-*) 가 일부 환경에서
// 해석되지 않는 케이스가 있어 직값으로 대체한다.
const SIGNAL_HEX: Record<InvestmentSignal, string> = {
  1: "#dc2626",
  2: "#f97316",
  3: "#64748b",
  4: "#3b82f6",
  5: "#1d4ed8",
};
const EMPTY_BAR_HEX = "#e2e8f0";

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
  const color = SIGNAL_HEX[signal];
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
              backgroundColor: i <= signal ? color : EMPTY_BAR_HEX,
              opacity: i <= signal ? 1 : 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}
