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
}

export default function DecisionStudio({
  topic,
  evidenceChips,
  scenarios,
  disclaimer,
  isLoading,
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
      {/* eyebrow */}
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-point)]">
        Decision Studio
      </p>

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
