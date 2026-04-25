// frontend/src/components/reports/WeeklyReportCard.tsx

import Card from "@/components/ui/Card";
import AchievementBar from "./AchievementBar";
import HighlightList from "./HighlightList";
import NextActionCard from "./NextActionCard";
import type { WeeklyReport } from "@/lib/types";

interface Props {
  report: WeeklyReport;
}

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const year = start.getFullYear();
  const month = start.getMonth() + 1;

  const firstDay = new Date(year, start.getMonth(), 1);
  const weekOfMonth = Math.ceil((start.getDate() + firstDay.getDay()) / 7);

  return `${year}년 ${month}월 ${weekOfMonth}주차 (${weekStart} ~ ${weekEnd})`;
}

export default function WeeklyReportCard({ report }: Props) {
  return (
    <Card>
      <div className="mb-4 border-b border-[var(--color-border)] pb-4">
        <h2 className="text-lg font-bold text-[var(--color-text)]">이번 주 복기 리포트</h2>
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">
          {formatWeekLabel(report.week_start, report.week_end)}
        </p>
      </div>

      <div className="mb-5 space-y-3">
        <AchievementBar label="행동 달성률" value={report.action_completion_rate} />
        <AchievementBar label="일지 작성" value={report.journal_count} unit="건" />
        <AchievementBar label="라이프 캐피털" value={report.capital_score} unit="점" />
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <HighlightList title="잘한 점" items={report.highlights} variant="positive" />
        <HighlightList title="놓친 점" items={report.improvements} variant="negative" />
      </div>

      {report.next_week_action && (
        <NextActionCard action={report.next_week_action} />
      )}

      {report.ai_summary && (
        <p className="mt-4 text-xs text-[var(--color-text-sub)] border-t border-[var(--color-border)] pt-3">
          {report.ai_summary}
        </p>
      )}
    </Card>
  );
}
