// frontend/src/components/news/SearchResultCard.tsx
"use client";

interface Props {
  sector: string;
  snippet: string;
  title?: string;
  url?: string;
  count: number;
  state?: "loading" | "done";
}

export default function SearchResultCard({
  sector,
  snippet,
  title,
  url,
  count,
  state = "done",
}: Props) {
  const isEmpty = state === "done" && count === 0;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-white p-3 sm:flex-row sm:items-center sm:gap-3">
      <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--color-bg)] px-3 py-1.5 text-xs font-bold text-[var(--color-text)]">
        {sector}
      </span>
      <div className="min-w-0 flex-1">
        {state === "loading" ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-sub)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary)]" />
            검색 중…
          </div>
        ) : isEmpty ? (
          <p className="text-xs text-[var(--color-text-sub)]">수집된 기사가 없습니다.</p>
        ) : (
          <p className="truncate text-[13px] text-[var(--color-text)]">
            <span className="mr-2 font-semibold">문서 수집 ({count}건):</span>
            {snippet}
          </p>
        )}
        {url && state === "done" && !isEmpty && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-[10px] text-[var(--color-primary)] hover:underline"
          >
            {title || url}
          </a>
        )}
      </div>
    </div>
  );
}
