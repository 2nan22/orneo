// frontend/src/components/studio/StudioJournalCard.tsx
"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { StudioJournal } from "@/lib/types";

const CATEGORY_BADGE: Record<string, { label: string; tone: "blue" | "green" }> = {
  investment: { label: "주식·투자", tone: "blue" },
  housing: { label: "부동산", tone: "green" },
};

interface Props {
  journal: StudioJournal;
  isSelected: boolean;
  isLoading: boolean;
  onSelect: (journal: StudioJournal) => void;
  onRequestScenario: (id: number) => void;
}

export default function StudioJournalCard({
  journal,
  isSelected,
  isLoading,
  onSelect,
  onRequestScenario,
}: Props) {
  const badge = CATEGORY_BADGE[journal.category];
  const hasScenario = journal.decision_scenario !== null;
  const formattedDate = new Date(journal.created_at).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });

  return (
    <Card
      interactive
      as="article"
      padding="md"
      className={[
        "cursor-pointer transition-all",
        isSelected ? "border-[#2563EB] ring-1 ring-[#2563EB]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(journal)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* 배지 + 날짜 */}
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {journal.dart_corp_name && (
              <span className="text-[10px] font-bold text-slate-500">
                {journal.dart_corp_name}
              </span>
            )}
            <span className="ml-auto text-[10px] text-slate-400">{formattedDate}</span>
          </div>

          {/* 제목 */}
          <p className="text-sm font-black leading-snug text-[#0B132B]">{journal.title}</p>

          {/* AI 요약 미리보기 */}
          {journal.ai_summary ? (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{journal.ai_summary}</p>
          ) : (
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              <svg
                className="h-3 w-3 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              AI 요약 생성 중...
            </div>
          )}
        </div>

        {/* 시나리오 상태 */}
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {hasScenario ? (
            <Badge tone="blue">시나리오 있음</Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                onRequestScenario(journal.id);
              }}
            >
              AI 분석
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
