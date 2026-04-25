// frontend/src/app/(app)/reports/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WeeklyReport } from "@/lib/types";
import WeeklyReportCard from "@/components/reports/WeeklyReportCard";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/ui/PageContainer";

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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-[var(--color-text-sub)]">불러오는 중...</span>
      </div>
    );
  }

  return (
    <PageContainer size="lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">주간 복기 리포트</h1>
        <Button variant="outline" onClick={handleGenerate} loading={generating}>
          리포트 생성
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {report ? (
        <WeeklyReportCard report={report} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center">
          <p className="text-sm text-[var(--color-text-sub)]">
            아직 리포트가 없습니다. 매주 월요일에 자동 생성됩니다.
          </p>
          <Button variant="primary" onClick={handleGenerate} loading={generating}>
            지금 생성하기
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
