// frontend/src/components/dashboard/HeroScoreCard.tsx
"use client";

import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import LevelDots from "@/components/ui/LevelDots";
import { formatMeasure, LEVEL_META, toLevel } from "@/lib/level";
import type { MeasureMode } from "@/components/ui/MeasurementToggle";

interface Props {
  score: number;
  measureMode: MeasureMode;
  summaryText?: string;
  deltaScore?: number | null;
  className?: string;
}

export default function HeroScoreCard({ score, measureMode, summaryText, deltaScore, className = "" }: Props) {
  const heroLevel = LEVEL_META[toLevel(score)];
  const displayValue = formatMeasure(score, measureMode);
  const deltaText = (() => {
    if (measureMode === "level") return heroLevel.copy;
    if (deltaScore != null) {
      const sign = deltaScore > 0 ? "+" : "";
      return `${sign}${deltaScore}점`;
    }
    return "";
  })();

  const defaultSummary =
    "돈·시간·집중력의 흐름이 안정적이에요.\n오늘은 무리한 매수보다 근거를 쌓고\n학습 시간을 지키는 날입니다.";

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[var(--radius-3xl)]",
        "bg-[#0B132B] p-5 text-white",
        "shadow-xl shadow-blue-950/15",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* 블러 볼 장식 */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#2563EB]/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-[#00C2A8]/35 blur-3xl" />

      <div className="relative">
        {/* 상단: 배지 + 아이콘 */}
        <div className="mb-6 flex items-center justify-between">
          <Badge tone="green">AI Life Capital OS</Badge>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-[#00C2A8]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 19V5" /><path d="M4 19h16" />
            <path d="M7 15l4-4 3 3 5-7" />
          </svg>
        </div>

        {/* 레이블 */}
        <p className="text-sm font-bold text-white/[.68]">이번 주 라이프 캐피털 상태</p>

        {/* 점수/레벨 + 변화량 */}
        <div className="mt-2 flex items-end gap-3">
          <strong className="text-5xl font-black tracking-[-0.08em]">{displayValue}</strong>
          {deltaText && (
            <span className="mb-2 rounded-full bg-[#00C2A8]/12 px-2.5 py-1 text-sm font-black text-[#7FFFEA]">
              {deltaText}
            </span>
          )}
        </div>

        {/* 요약 텍스트 */}
        <p className="mt-4 max-w-[19rem] whitespace-pre-line text-sm text-white/[.78]">
          {summaryText ?? defaultSummary}
        </p>

        {/* Progress 또는 LevelDots */}
        <div className="mt-5">
          {measureMode === "score"
            ? <Progress value={score} tone="blue" />
            : <LevelDots value={score} />
          }
        </div>
      </div>
    </section>
  );
}
