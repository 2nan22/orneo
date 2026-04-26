// frontend/src/components/journal/DecisionStudio.tsx
"use client";

import Card from "@/components/ui/Card";

const RISK_STYLES: Record<string, string> = {
  "높음": "bg-red-50 text-red-500",
  "중간": "bg-amber-50 text-amber-600",
  "낮음": "bg-[var(--color-point-light)] text-[var(--color-point)]",
};

interface Scenario {
  id: string;
  title: string;
  risk: string;
  description: string;
}

interface Props {
  topic: string;
  evidenceChips: string[];
  scenarios: Scenario[];
  disclaimer: string;
  isLoading?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export default function DecisionStudio({
  topic,
  evidenceChips,
  scenarios,
  disclaimer,
  isLoading,
  onRegenerate,
  isRegenerating,
}: Props) {
  if (isLoading) {
    return (
      <Card padding="md" className="animate-pulse">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-point)]">
          Decision Studio
        </p>
        <div className="mb-4 h-4 w-40 rounded bg-[var(--color-border)]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-2 h-16 rounded-xl bg-[var(--color-border)]" />
        ))}
      </Card>
    );
  }

  return (
    <Card padding="md">
      {/* eyebrow + 재생성 버튼 */}
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-point)]">
          Decision Studio
        </p>
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium
                       text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)]
                       disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            title="시나리오 재생성"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isRegenerating ? "animate-spin" : ""}
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" />
            </svg>
            {isRegenerating ? "재생성 중..." : "재생성"}
          </button>
        )}
      </div>

      {/* 주제 */}
      <p className="mb-3 text-sm font-bold text-[var(--color-text)]">{topic}</p>

      {/* 근거 데이터 칩 */}
      {evidenceChips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {evidenceChips.map((chip, i) => (
            <span
              key={i}
              className="rounded-full bg-[var(--color-bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-sub)]"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* A/B/C 시나리오 카드 */}
      <div className="flex flex-col gap-2">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] px-4 py-3"
          >
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                <span className="mr-2 text-[var(--color-text-sub)]">{s.id}.</span>
                {s.title}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  RISK_STYLES[s.risk] ?? RISK_STYLES["중간"]
                }`}
              >
                {s.risk}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-sub)]">{s.description}</p>
          </div>
        ))}
      </div>

      {/* 면책 고지 — 필수 */}
      {disclaimer && (
        <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">{disclaimer}</p>
      )}
    </Card>
  );
}
