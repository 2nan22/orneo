// frontend/src/components/dashboard/CapitalScoreGauge.tsx
"use client";

interface Props {
  score: number;
}

export default function CapitalScoreGauge({ score }: Props) {
  const r = 72;
  const cx = 96;
  const cy = 96;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  const dashoffset = circumference * (1 - clamped / 100);

  const color =
    clamped >= 70 ? "#00C2A8" : clamped >= 40 ? "#2563EB" : "#F59E0B";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="192" height="192" viewBox="0 0 192 192" aria-label={`라이프 캐피털 점수 ${score}`}>
        {/* 배경 트랙 */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="14"
        />
        {/* 점수 호 */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        {/* 점수 텍스트 */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="36"
          fontWeight="700"
          fill="var(--color-text)"
        >
          {score === 0 ? "—" : score}
        </text>
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          fontSize="12"
          fill="var(--color-text-sub)"
        >
          / 100
        </text>
      </svg>
      <p className="text-sm font-medium text-[var(--color-text-sub)]">라이프 캐피털 점수</p>
    </div>
  );
}
