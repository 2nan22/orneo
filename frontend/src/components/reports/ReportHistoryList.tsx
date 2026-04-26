// frontend/src/components/reports/ReportHistoryList.tsx
"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Progress from "@/components/ui/Progress";
import WeeklyReportCard from "./WeeklyReportCard";
import { formatMeasure } from "@/lib/level";
import type { WeeklyReport } from "@/lib/types";
import type { MeasureMode } from "@/components/ui/MeasurementToggle";

interface Props {
  reports: WeeklyReport[];
  isLoading: boolean;
  measureMode: MeasureMode;
}

export default function ReportHistoryList({ reports, isLoading, measureMode }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-[var(--radius-2xl)] bg-[var(--color-border)]" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card variant="outlined" className="py-12 text-center">
        <p className="text-sm text-[var(--color-text-sub)]">저장된 리포트가 없습니다.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => {
        const isExpanded = expandedId === report.id;
        const completionPct = Math.round(report.action_completion_rate * 100);

        return (
          <div key={report.id}>
            {/* 요약 행 */}
            <Card
              interactive
              onClick={() => setExpandedId(isExpanded ? null : report.id)}
              className="mb-0"
            >
              <div className="flex items-center gap-4">
                {/* 날짜 */}
                <div className="shrink-0 text-center">
                  <p className="text-xs font-black text-[#2563EB]">
                    {new Date(report.week_start).toLocaleDateString("ko-KR", { month: "short" })}
                  </p>
                  <p className="text-sm font-black text-[#0B132B]">
                    {new Date(report.week_start).toLocaleDateString("ko-KR", { day: "numeric" })}
                    {" "}~{" "}
                    {new Date(report.week_end).toLocaleDateString("ko-KR", { day: "numeric" })}
                  </p>
                </div>

                {/* 지표 요약 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xs font-bold text-slate-500">달성률</span>
                    <span className="text-sm font-black text-[#0B132B]">
                      {formatMeasure(completionPct, measureMode, "%")}
                    </span>
                    <span className="ml-auto text-xs font-bold text-[#2563EB]">
                      {report.capital_score}점
                    </span>
                  </div>
                  <Progress value={completionPct} />
                </div>

                {/* 펼치기 화살표 */}
                <span
                  className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </div>
            </Card>

            {/* 상세 펼치기 */}
            {isExpanded && (
              <div className="mt-2">
                <WeeklyReportCard report={report} measureMode={measureMode} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
