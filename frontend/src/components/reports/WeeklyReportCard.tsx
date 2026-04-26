// frontend/src/components/reports/WeeklyReportCard.tsx

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Progress from "@/components/ui/Progress";
import LevelDots from "@/components/ui/LevelDots";
import NextActionCard from "./NextActionCard";
import { formatMeasure } from "@/lib/level";
import type { WeeklyReport } from "@/lib/types";
import type { MeasureMode } from "@/components/ui/MeasurementToggle";

interface Props {
  report: WeeklyReport;
  measureMode?: MeasureMode;
}

export default function WeeklyReportCard({ report, measureMode = "score" }: Props) {
  const completionPct = Math.round(report.action_completion_rate * 100);

  return (
    <>
      {/* 달성률 카드 */}
      <Card className="relative overflow-hidden p-5 mb-4">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2563EB] to-[#00C2A8]" />

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500">행동 달성 상태</p>
            <div className="mt-2 flex items-end gap-2">
              <strong className="text-5xl font-black tracking-[-0.08em] text-[#2563EB]">
                {formatMeasure(completionPct, measureMode, "%")}
              </strong>
            </div>
          </div>
          <Badge tone="amber">
            목표 {measureMode === "score" ? "80%" : "좋음"}
          </Badge>
        </div>

        <div className="mt-5">
          {measureMode === "score"
            ? <Progress value={completionPct} />
            : <LevelDots value={completionPct} />
          }
        </div>

        <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
          {report.ai_summary || "계획의 절반 이상은 실행했어요."}
        </p>
      </Card>

      {/* 잘한 점 / 놓친 점 2컬럼 */}
      <section className="grid gap-3 mb-4 sm:grid-cols-2">
        <Card className="border-l-4 border-l-[#00C2A8]">
          <h2 className="mb-4 text-lg font-black text-[#0B132B]">잘한 점</h2>
          {report.highlights.length === 0 ? (
            <p className="text-sm text-slate-500">내용이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {report.highlights.map((item) => (
                <li key={item} className="text-sm leading-6 text-slate-600">• {item}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <h2 className="mb-4 text-lg font-black text-[#0B132B]">놓친 점</h2>
          {report.improvements.length === 0 ? (
            <p className="text-sm text-slate-500">내용이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {report.improvements.map((item) => (
                <li key={item} className="text-sm leading-6 text-slate-600">• {item}</li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {report.next_week_action && (
        <NextActionCard action={report.next_week_action} />
      )}
    </>
  );
}
