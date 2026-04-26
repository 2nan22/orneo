// frontend/src/app/(app)/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WeeklyReport } from "@/lib/types";
import WeeklyReportCard from "@/components/reports/WeeklyReportCard";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import { useMeasureMode } from "@/lib/measureModeContext";

function getPreviousMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default function ReportsPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { measureMode } = useMeasureMode();

  useEffect(() => {
    fetchLatestReport();
  }, []);

  async function fetchLatestReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<WeeklyReport>("/reports/weekly/latest");
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const weekStart = getPreviousMonday();
      await api.post("/reports/weekly/generate", { week_start: weekStart });
      await fetchLatestReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : "리포트 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageContainer size="lg">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">WEEKLY REVIEW</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">
          지난주 복기 리포트
        </h1>
        <p className="mt-2 whitespace-pre-line text-sm text-[#334155]">
          {"ORNEO AI가 실행 데이터와 일지를 분석해요.\n다음 주 핵심 행동을 하나로 줄여줍니다."}
        </p>
      </div>

      <div className="mb-5 flex justify-end">
        <Button variant="outline" onClick={handleGenerate} loading={generating}>
          리포트 생성
        </Button>
      </div>

      {error && (
        <Card variant="outlined" className="mb-4">
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-[var(--radius-2xl)] bg-[var(--color-border)]" />
          ))}
        </div>
      ) : report ? (
        <WeeklyReportCard report={report} measureMode={measureMode} />
      ) : (
        <Card variant="outlined" className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-[var(--color-text-sub)]">
            아직 리포트가 없습니다. 매주 월요일에 자동 생성됩니다.
          </p>
          <Button variant="primary" onClick={handleGenerate} loading={generating}>
            지금 생성하기
          </Button>
        </Card>
      )}
    </PageContainer>
  );
}
