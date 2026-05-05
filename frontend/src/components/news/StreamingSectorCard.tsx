// frontend/src/components/news/StreamingSectorCard.tsx
"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Card from "@/components/ui/Card";
import SignalIndicator from "@/components/news/SignalIndicator";
import StockRecommendationChips from "@/components/news/StockRecommendationChips";
import type { InvestmentSignal, RecommendedStock } from "@/lib/types";

export type StreamStatus = "pending" | "streaming" | "done";

interface Props {
  name: string;
  text: string;
  status: StreamStatus;
  articleCount?: number;
  elapsedMs?: number;
  signal?: InvestmentSignal;
  stocks?: RecommendedStock[];
}

const COMPONENTS: Components = {
  h1: ({ children, ...props }) => (
    <h4
      className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] first:mt-0"
      {...props}
    >
      {children}
    </h4>
  ),
  h2: ({ children, ...props }) => (
    <h4
      className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary)] first:mt-0"
      {...props}
    >
      {children}
    </h4>
  ),
  ul: ({ children, ...props }) => (
    <ul
      className="mb-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed"
      {...props}
    >
      {children}
    </ul>
  ),
  p: ({ children, ...props }) => (
    <p
      className="mb-2 text-[13px] leading-relaxed text-[var(--color-text)] last:mb-0"
      {...props}
    >
      {children}
    </p>
  ),
};

function StatusDot({ status }: { status: StreamStatus }) {
  if (status === "done") {
    return <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-point,#00C2A8)]" />;
  }
  if (status === "streaming") {
    return (
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-primary)] opacity-60" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
      </span>
    );
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-border)]" />;
}

/** LLM이 본문 끝에 덧붙이는 `{"investment_signal":...}` JSON 꼬리를 잘라낸다. */
function stripSignalJson(text: string): string {
  const idx = text.lastIndexOf('{"investment_signal"');
  if (idx === -1) return text;
  return text.slice(0, idx).trimEnd();
}

export default function StreamingSectorCard({
  name,
  text,
  status,
  articleCount,
  elapsedMs,
  signal,
  stocks,
}: Props) {
  const displayText = stripSignalJson(text);
  const cardClass =
    status === "pending"
      ? "border-dashed opacity-60"
      : status === "streaming"
        ? "border-[var(--color-primary)]"
        : "";

  const statusLabel =
    status === "pending"
      ? "대기 중…"
      : status === "streaming"
        ? "분석 중…"
        : elapsedMs !== undefined
          ? `${(elapsedMs / 1000).toFixed(1)}s`
          : "완료";

  return (
    <Card variant="outlined" padding="md" className={cardClass}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="md:w-1/4 md:shrink-0">
          <div className="flex items-center gap-2">
            <StatusDot status={status} />
            <h3 className="text-sm font-bold text-[var(--color-text)]">{name}</h3>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {articleCount !== undefined && (
              <span className="rounded-full bg-[var(--color-bg)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-sub)]">
                {articleCount}건
              </span>
            )}
            <span className="text-[10px] text-[var(--color-text-sub)]">
              {statusLabel}
            </span>
          </div>
          {status === "done" && signal !== undefined && (
            <div className="mt-2">
              <SignalIndicator signal={signal} size="sm" showLabel />
            </div>
          )}
          {status === "done" && stocks && stocks.length > 0 && (
            <div className="mt-2">
              <StockRecommendationChips stocks={stocks} />
            </div>
          )}
        </div>

        <div className="min-w-0 md:flex-1">
          {status === "pending" ? (
            <div className="space-y-1">
              <div className="h-2 w-3/4 rounded bg-[var(--color-border)] opacity-50" />
              <div className="h-2 w-1/2 rounded bg-[var(--color-border)] opacity-40" />
            </div>
          ) : displayText.trim() ? (
            <div className="flex flex-col break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
                {displayText}
              </ReactMarkdown>
              {status === "streaming" && (
                <span className="mt-1 inline-block h-3 w-[2px] animate-pulse bg-[var(--color-primary)]" />
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text-sub)]">
              분석 결과가 비어 있습니다.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
