// frontend/src/components/news/NewsBriefingDetail.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/ui/PageContainer";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { NewsAnalysis, NewsTaskStatus } from "@/lib/types";

interface Props {
  /** 특정 날짜를 강제할 경우 (없으면 latest) */
  initialDate?: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 60; // 약 3분

function shiftDate(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map((s) => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * `## 헤더` 단위로 텍스트를 분할해 카드 본문을 그린다.
 * (LangGraph 출력은 `## Summary / ## Key Signals / ## Risk Factors` 3섹션)
 */
function MarkdownSections({ text }: { text: string }) {
  if (!text.trim()) {
    return <p className="text-xs text-[var(--color-text-sub)]">분석 본문이 비어 있습니다.</p>;
  }
  const sections: Array<{ heading: string | null; body: string }> = [];
  const parts = text.split(/^##\s+/m);
  if (parts[0].trim()) sections.push({ heading: null, body: parts[0].trim() });
  for (const part of parts.slice(1)) {
    const lineBreak = part.indexOf("\n");
    if (lineBreak === -1) {
      sections.push({ heading: part.trim(), body: "" });
    } else {
      sections.push({
        heading: part.slice(0, lineBreak).trim(),
        body: part.slice(lineBreak + 1).trim(),
      });
    }
  }
  return (
    <div className="flex flex-col gap-3">
      {sections.map((s, i) => (
        <div key={i}>
          {s.heading && (
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
              {s.heading}
            </h4>
          )}
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)]">
            {s.body}
          </p>
        </div>
      ))}
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
  const [taskId, setTaskId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollCountRef = useRef(0);

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

  useEffect(() => {
    if (!taskId || !polling) return;
    const intervalId = window.setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        window.clearInterval(intervalId);
        setPolling(false);
        addToast("분석이 시간 내 완료되지 않았습니다. 잠시 후 다시 확인해주세요.", "error");
        return;
      }
      try {
        const status = await api.get<NewsTaskStatus>(`/news/analyses/tasks/${taskId}/`);
        if (status.state === "SUCCESS") {
          window.clearInterval(intervalId);
          setPolling(false);
          addToast("분석이 완료되었습니다.", "success");
          await loadAnalysis();
        } else if (status.state === "FAILURE") {
          window.clearInterval(intervalId);
          setPolling(false);
          addToast(`분석 실패: ${status.error ?? "알 수 없는 오류"}`, "error");
        }
      } catch {
        // 일시 오류는 무시 — 다음 폴링 사이클에서 재시도
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [taskId, polling, loadAnalysis, addToast]);

  async function handleRegenerate() {
    if (polling) return;
    const targetDate = analysis?.analysis_date ?? initialDate ?? new Date().toISOString().slice(0, 10);
    if (!window.confirm("뉴스 분석을 다시 실행합니다. 약 30초~1분 소요됩니다. 계속할까요?")) return;
    try {
      const res = await api.post<{ task_id: string }>("/news/analyses/run/", {
        market: "KR",
        target_date: targetDate,
      });
      pollCountRef.current = 0;
      setTaskId(res.task_id);
      setPolling(true);
      addToast("분석을 시작했습니다. 완료되면 자동으로 갱신됩니다.", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "분석 요청 실패", "error");
    }
  }

  function handlePrevDate() {
    const base = analysis?.analysis_date ?? initialDate ?? new Date().toISOString().slice(0, 10);
    router.push(`/news/${shiftDate(base, -1)}`);
  }

  function handleNextDate() {
    const base = analysis?.analysis_date ?? initialDate ?? new Date().toISOString().slice(0, 10);
    router.push(`/news/${shiftDate(base, +1)}`);
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
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]
                       border border-[var(--color-border)] text-sm text-[var(--color-text-sub)]
                       hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            aria-label="다음 날짜"
          >
            ›
          </button>
          <Button
            variant="point"
            size="sm"
            onClick={handleRegenerate}
            disabled={polling}
          >
            {polling ? "분석 중…" : "🔄 다시 생성"}
          </Button>
        </div>
      </header>

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
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text)]">
              {analysis.overall_analysis || "(요약이 비어 있습니다)"}
            </p>
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
                return <MarkdownSections text={active.analysis_text} />;
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
