// frontend/src/components/journal/JournalCard.tsx
import Card from "@/components/ui/Card";
import DartDisclosureBadge from "./DartDisclosureBadge";
import type { JournalEntry, JournalCategory } from "@/lib/types";

const CATEGORY_META: Record<
  JournalCategory,
  { label: string; color: string; bg: string }
> = {
  investment: { label: "투자", color: "#2563EB", bg: "#EFF6FF" },
  housing: { label: "주거", color: "#7C3AED", bg: "#F5F3FF" },
  learning: { label: "학습", color: "#059669", bg: "#ECFDF5" },
  routine: { label: "루틴", color: "#D97706", bg: "#FFFBEB" },
};

interface Props {
  entry: JournalEntry;
  onReview: (entry: JournalEntry) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

export default function JournalCard({ entry, onReview }: Props) {
  const meta = CATEGORY_META[entry.category];
  const summaryLoading = entry.ai_summary === null;

  return (
    <Card
      interactive
      as="article"
      padding="md"
      onClick={() => onReview(entry)}
      className="p-5"
    >
      {/* 상단 행: 카테고리 배지 + 복기 배지 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>

        {entry.is_reviewed ? (
          <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-xs font-semibold text-[#059669]">
            복기 완료
          </span>
        ) : (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-500">
            복기 필요
          </span>
        )}
      </div>

      {/* 제목 */}
      <h3 className="mb-1.5 font-semibold text-[var(--color-text)]">{entry.title}</h3>

      {/* DART 공시 배지 — investment 카테고리만 */}
      {entry.category === "investment" && (
        <DartDisclosureBadge
          title={entry.title}
          category={entry.category}
          dart_corp_code={entry.dart_corp_code}
          dart_corp_name={entry.dart_corp_name}
        />
      )}

      {/* AI 요약 */}
      {summaryLoading ? (
        <div className="flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-xs text-[var(--color-text-sub)]">AI 요약 생성 중...</span>
        </div>
      ) : (
        <p className="line-clamp-2 text-sm text-[var(--color-text-sub)]">{entry.ai_summary}</p>
      )}

      {/* 하단: 작성일 */}
      <p className="mt-3 text-xs text-[var(--color-text-sub)]">{formatDate(entry.created_at)}</p>
    </Card>
  );
}
