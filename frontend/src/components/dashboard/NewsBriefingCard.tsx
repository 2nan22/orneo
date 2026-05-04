// frontend/src/components/dashboard/NewsBriefingCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { api } from "@/lib/api";
import type { NewsAnalysis } from "@/lib/types";

const PREVIEW_CHARS = 220;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export default function NewsBriefingCard({ className = "" }: { className?: string }) {
  const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<NewsAnalysis>("/news/analyses/latest/?market=KR")
      .then((res) => {
        if (alive) {
          setAnalysis(res);
          setNotFound(false);
        }
      })
      .catch((err) => {
        if (alive) {
          setNotFound(true);
          setAnalysis(null);
          if (!String(err).includes("아직 생성된")) {
            // eslint-disable-next-line no-console
            console.warn("뉴스 브리핑 로드 실패:", err);
          }
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <Card className={className} padding="md">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-1/3 rounded bg-[var(--color-border)]" />
          <div className="h-3 w-full rounded bg-[var(--color-border)]" />
          <div className="h-3 w-5/6 rounded bg-[var(--color-border)]" />
        </div>
      </Card>
    );
  }

  if (notFound || !analysis) {
    return (
      <Card className={className} variant="outlined" padding="md">
        <header className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--color-text)]">📰 오늘의 시장 브리핑</h3>
        </header>
        <p className="text-xs text-[var(--color-text-sub)]">
          아직 생성된 브리핑이 없습니다.
        </p>
        <Link
          href="/news"
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)]
                     px-3 py-1 text-[11px] font-semibold text-[var(--color-primary)]
                     hover:bg-[var(--color-primary)]/5 transition-colors"
        >
          지금 생성하기 →
        </Link>
      </Card>
    );
  }

  return (
    <Link href={`/news/${analysis.analysis_date}`} className={className}>
      <Card interactive padding="md">
        <header className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            📰 오늘의 시장 브리핑
          </h3>
          <span className="text-[10px] text-[var(--color-text-sub)]">
            {analysis.analysis_date} · {analysis.market}
          </span>
        </header>

        <p className="text-xs leading-relaxed text-[var(--color-text-sub)]">
          {truncate(analysis.overall_analysis || "(분석 본문이 비어 있습니다)", PREVIEW_CHARS)}
        </p>

        {analysis.sector_analyses.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {analysis.sector_analyses.slice(0, 6).map((s) => (
              <li
                key={s.id}
                className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]
                           px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-text-sub)]"
              >
                {s.sector_name_ko}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">
          참고용 정보이며 투자 권유가 아닙니다. 자세히 보기 →
        </p>
      </Card>
    </Link>
  );
}
