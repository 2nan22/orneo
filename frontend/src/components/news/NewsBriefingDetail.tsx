// frontend/src/components/news/NewsBriefingDetail.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/ui/PageContainer";
import StreamingSectorCard, {
  type StreamStatus,
} from "@/components/news/StreamingSectorCard";
import { api } from "@/lib/api";
import { readSSE } from "@/lib/sse";
import { useToast } from "@/contexts/ToastContext";
import type { NewsAnalysis } from "@/lib/types";

type SectorStream = {
  text: string;
  status: StreamStatus;
  articleCount?: number;
  elapsedMs?: number;
};

type GraphStartEv = { sectors?: string[]; target_date?: string; market?: string };
type NodeEv = {
  node?: string;
  sector?: string;
  full_text?: string;
  sector_analyses?: Record<string, string>;
  sector_article_counts?: Record<string, number>;
};
type TokenEv = { scope?: "sector" | "aggregate"; sector?: string; text?: string };
type ErrorEv = { message?: string };

interface Props {
  /** 특정 날짜를 강제할 경우 (없으면 latest) */
  initialDate?: string;
}

function shiftDate(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map((s) => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children, ...props }) => (
    <h4
      className="mb-1 mt-4 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]"
      {...props}
    >
      {children}
    </h4>
  ),
  h2: ({ children, ...props }) => (
    <h4
      className="mb-1 mt-4 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] first:mt-0"
      {...props}
    >
      {children}
    </h4>
  ),
  h3: ({ children, ...props }) => (
    <h5
      className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-sub)]"
      {...props}
    >
      {children}
    </h5>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 text-sm leading-relaxed" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-[var(--color-text)]" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 text-sm leading-relaxed text-[var(--color-text)] last:mb-0" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-[var(--color-text)]" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="text-[var(--color-text)]" {...props}>
      {children}
    </em>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-[var(--color-primary)] pl-3 text-sm italic text-[var(--color-text-sub)]"
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-[var(--color-primary)] underline hover:no-underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ children, ...props }) => (
    <code
      className="rounded bg-[var(--color-bg)] px-1 py-0.5 text-[12px] text-[var(--color-text)]"
      {...props}
    >
      {children}
    </code>
  ),
};

function SectorMarkdown({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-xs text-[var(--color-text-sub)]">분석 본문이 비어 있습니다.</p>;
  }
  return (
    <div className="flex flex-col">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default function NewsBriefingDetail({ initialDate }: Props) {
  const router = useRouter();
  const { addToast } = useToast();
  const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeSectorId, setActiveSectorId] = useState<number | null>(null);

  // 실시간 스트리밍 상태
  const [streamingActive, setStreamingActive] = useState(false);
  const [streamSectors, setStreamSectors] = useState<Record<string, SectorStream>>({});
  const [streamOverall, setStreamOverall] = useState<{ text: string; status: StreamStatus }>({
    text: "",
    status: "pending",
  });
  const [sectorOrder, setSectorOrder] = useState<string[]>([]);

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const path = initialDate
        ? `/news/analyses/by-date/${initialDate}/?market=KR`
        : `/news/analyses/latest/?market=KR`;
      const res = await api.get<NewsAnalysis>(path);
      setAnalysis(res);
      setActiveSectorId(res.sector_analyses[0]?.id ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "분석 결과를 불러오지 못했습니다.";
      setErrorMsg(msg);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [initialDate]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  async function handleRegenerate() {
    if (streamingActive) return;
    const targetDate =
      analysis?.analysis_date ?? initialDate ?? new Date().toISOString().slice(0, 10);
    if (!window.confirm("뉴스 분석을 다시 실행합니다. 약 1~3분 소요됩니다. 계속할까요?")) return;

    setStreamingActive(true);
    setStreamSectors({});
    setSectorOrder([]);
    setStreamOverall({ text: "", status: "pending" });

    let res: Response;
    try {
      res = await fetch("/api/v1/news/analyses/run-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market: "KR", target_date: targetDate }),
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "스트리밍 시작 실패", "error");
      setStreamingActive(false);
      return;
    }

    if (!res.ok) {
      addToast(`분석 요청 실패: HTTP ${res.status}`, "error");
      setStreamingActive(false);
      return;
    }

    let lastTokenAt = Date.now();
    let warned = false;
    const watchdog = window.setInterval(() => {
      if (!warned && Date.now() - lastTokenAt > 30_000) {
        warned = true;
        addToast("AI 서비스 응답이 지연되고 있습니다.", "error");
      }
    }, 5_000);

    try {
      for await (const ev of readSSE<unknown>(res)) {
        lastTokenAt = Date.now();
        switch (ev.event) {
          case "graph_start": {
            const data = ev.data as GraphStartEv;
            const sectors = data.sectors ?? [];
            setSectorOrder(sectors);
            setStreamSectors(
              Object.fromEntries(
                sectors.map((s) => [s, { text: "", status: "pending" as StreamStatus }]),
              ),
            );
            break;
          }
          case "node_start": {
            const data = ev.data as NodeEv;
            if (data.node === "sector_analyze_node") {
              setStreamSectors((prev) => {
                const next: Record<string, SectorStream> = { ...prev };
                for (const k of Object.keys(next)) {
                  if (next[k].status === "pending") {
                    next[k] = { ...next[k], status: "streaming" };
                  }
                }
                return next;
              });
            } else if (data.node === "aggregate_node") {
              setStreamOverall((prev) => ({ ...prev, status: "streaming" }));
            }
            break;
          }
          case "token": {
            const data = ev.data as TokenEv;
            const text = data.text ?? "";
            if (data.scope === "sector" && data.sector) {
              const k = data.sector;
              setStreamSectors((prev) => {
                const cur = prev[k] ?? { text: "", status: "streaming" as StreamStatus };
                return {
                  ...prev,
                  [k]: { ...cur, text: cur.text + text, status: "streaming" },
                };
              });
            } else if (data.scope === "aggregate") {
              setStreamOverall((prev) => ({
                text: prev.text + text,
                status: "streaming",
              }));
            }
            break;
          }
          case "node_done": {
            const data = ev.data as NodeEv;
            if (data.node === "sector_analyze_node" && data.sector_analyses) {
              const counts = data.sector_article_counts ?? {};
              setStreamSectors((prev) => {
                const next: Record<string, SectorStream> = { ...prev };
                for (const [name, full] of Object.entries(data.sector_analyses ?? {})) {
                  const cur = next[name] ?? { text: "", status: "done" as StreamStatus };
                  next[name] = {
                    ...cur,
                    text: full,
                    status: "done",
                    articleCount: counts[name] ?? cur.articleCount,
                  };
                }
                return next;
              });
            } else if (data.node === "aggregate_node" && typeof data.full_text === "string") {
              setStreamOverall({ text: data.full_text, status: "done" });
            }
            break;
          }
          case "complete": {
            await loadAnalysis();
            addToast("분석이 완료되었습니다.", "success");
            break;
          }
          case "error": {
            const data = ev.data as ErrorEv;
            addToast(`분석 실패: ${data.message ?? "알 수 없는 오류"}`, "error");
            break;
          }
        }
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "스트리밍 중 오류", "error");
    } finally {
      window.clearInterval(watchdog);
      setStreamingActive(false);
    }
  }


  const today = new Date().toISOString().slice(0, 10);
  const currentDate = analysis?.analysis_date ?? initialDate ?? today;
  const nextDate = shiftDate(currentDate, 1);
  const isAtToday = currentDate >= today;

  function handlePrevDate() {
    router.push(`/news/${shiftDate(currentDate, -1)}`);
  }

  function handleNextDate() {
    if (isAtToday) return;
    router.push(`/news/${nextDate}`);
  }

  return (
    <PageContainer size="lg">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">MARKET BRIEFING</p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[#0B132B]">
            📰 KR 시장 브리핑
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDate}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]
                       border border-[var(--color-border)] text-sm text-[var(--color-text-sub)]
                       hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            aria-label="이전 날짜"
          >
            ‹
          </button>
          <span className="min-w-[112px] text-center text-sm font-semibold text-[var(--color-text)]">
            {analysis?.analysis_date ?? initialDate ?? "—"}
          </span>
          <button
            type="button"
            onClick={handleNextDate}
            disabled={isAtToday}
            aria-disabled={isAtToday}
            title={isAtToday ? "오늘 이후 날짜는 선택할 수 없습니다" : undefined}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]
                       border border-[var(--color-border)] text-sm text-[var(--color-text-sub)]
                       hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
                       disabled:cursor-not-allowed disabled:opacity-40
                       disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text-sub)]"
            aria-label="다음 날짜"
          >
            ›
          </button>
          <Button
            variant="point"
            size="sm"
            onClick={handleRegenerate}
            disabled={streamingActive}
          >
            {streamingActive ? "분석 중…" : "🔄 다시 생성"}
          </Button>
        </div>
      </header>

      {streamingActive && (
        <div className="mb-4 flex flex-col gap-3">
          <Card padding="md" variant="outlined">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--color-text)]">실시간 분석</h2>
              <span className="text-[10px] text-[var(--color-text-sub)]">
                노드별 진행 상황을 실시간으로 표시합니다.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectorOrder.map((name) => {
                const s = streamSectors[name] ?? { text: "", status: "pending" as StreamStatus };
                return (
                  <StreamingSectorCard
                    key={name}
                    name={name}
                    text={s.text}
                    status={s.status}
                    articleCount={s.articleCount}
                    elapsedMs={s.elapsedMs}
                  />
                );
              })}
            </div>

            <div className="mt-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--color-text)]">종합 요약</span>
                <span className="text-[10px] text-[var(--color-text-sub)]">
                  {streamOverall.status === "pending"
                    ? "대기 중…"
                    : streamOverall.status === "streaming"
                      ? "작성 중…"
                      : "완료"}
                </span>
              </div>
              {streamOverall.text ? (
                <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
                  {streamOverall.text}
                  {streamOverall.status === "streaming" && (
                    <span className="ml-1 inline-block h-3 w-[2px] animate-pulse bg-[var(--color-primary)] align-middle" />
                  )}
                </p>
              ) : (
                <p className="text-xs text-[var(--color-text-sub)]">
                  섹터 분석이 끝나면 자동으로 작성됩니다.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {loading ? (
        <Card padding="md">
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-1/3 rounded bg-[var(--color-border)]" />
            <div className="h-3 w-full rounded bg-[var(--color-border)]" />
            <div className="h-3 w-5/6 rounded bg-[var(--color-border)]" />
          </div>
        </Card>
      ) : errorMsg ? (
        <Card variant="outlined" padding="md">
          <p className="text-sm text-[var(--color-danger)]">{errorMsg}</p>
          <p className="mt-2 text-xs text-[var(--color-text-sub)]">
            우측 상단 “다시 생성” 버튼으로 분석을 직접 실행할 수 있습니다.
          </p>
        </Card>
      ) : analysis ? (
        <div className="flex flex-col gap-4">
          {/* 종합 요약 */}
          <Card padding="md">
            <h2 className="mb-2 text-sm font-bold text-[var(--color-text)]">종합 요약</h2>
            {analysis.overall_analysis ? (
              <SectorMarkdown text={analysis.overall_analysis} />
            ) : (
              <p className="text-sm text-[var(--color-text-sub)]">(요약이 비어 있습니다)</p>
            )}
            {analysis.run_duration_ms !== null && (
              <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">
                생성 소요: {(analysis.run_duration_ms / 1000).toFixed(1)}s · 엔진: {analysis.engine_type}
              </p>
            )}
          </Card>

          {/* 섹터 탭 */}
          {analysis.sector_analyses.length > 0 && (
            <Card padding="md">
              <div className="-mx-4 mb-3 overflow-x-auto px-4 pl-1">
                <ul className="flex min-w-max gap-2">
                  {analysis.sector_analyses.map((s) => {
                    const isActive = activeSectorId === s.id;
                    const isEmpty = s.article_count === 0;
                    let chipClass: string;
                    if (isActive) {
                      chipClass = "border-[var(--color-primary)] bg-[var(--color-primary)] text-white";
                    } else if (isEmpty) {
                      chipClass =
                        "border-dashed border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-sub)] opacity-60 hover:opacity-90";
                    } else {
                      chipClass =
                        "border-[var(--color-border)] bg-white text-[var(--color-text-sub)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]";
                    }
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setActiveSectorId(s.id)}
                          className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${chipClass}`}
                          title={isEmpty ? "수집된 기사가 없습니다" : undefined}
                        >
                          {s.sector_name_ko}
                          <span className="ml-1.5 text-[10px] opacity-70">{s.article_count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {(() => {
                const active = analysis.sector_analyses.find((s) => s.id === activeSectorId);
                if (!active) return null;
                if (active.article_count === 0) {
                  return (
                    <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-4 text-center text-xs text-[var(--color-text-sub)]">
                      이 섹터는 해당 날짜에 수집된 기사가 없습니다.
                    </p>
                  );
                }
                return <SectorMarkdown text={active.analysis_text} />;
              })()}
            </Card>
          )}

          <p className="text-[10px] text-[var(--color-text-sub)]">
            출처: Tavily 검색 결과 · 본 자료는 교육·참고 목적이며 투자 권유가 아닙니다.
          </p>
        </div>
      ) : null}
    </PageContainer>
  );
}
