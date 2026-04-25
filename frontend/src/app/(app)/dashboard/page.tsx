// frontend/src/app/(app)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import CapitalScoreGauge from "@/components/dashboard/CapitalScoreGauge";
import ScoreBreakdown from "@/components/dashboard/ScoreBreakdown";
import KeyQuestion from "@/components/dashboard/KeyQuestion";
import TodayActions from "@/components/dashboard/TodayActions";
import { api } from "@/lib/api";
import type { DashboardData } from "@/lib/types";

const MOCK: DashboardData = {
  score: 78,
  asset_stability: 82,
  goal_progress: 71,
  routine_score: 65,
  key_question: "지금 매수보다 현금 확보가 더 나은 선택일까요?",
  today_actions: [
    { id: 1, text: "실거래가 변화 확인", completed: false },
    { id: 2, text: "투자 가설 일지 작성", completed: false },
    { id: 3, text: "K-MOOC 20분 학습", completed: false },
  ],
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>("/dashboard")
      .then(setData)
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleAction(id: number, completed: boolean) {
    await api.patch(`/dashboard/actions/${id}/`, { completed });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-sm text-[var(--color-text-sub)]">불러오는 중...</span>
      </div>
    );
  }

  const d = data ?? MOCK;

  return (
    <PageContainer size="lg">
      <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)]">라이프 캐피털 대시보드</h1>

      {/* 점수 섹션 */}
      <Card className="mb-4">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-text-sub)]">
          이번 주 라이프 캐피털 점수
        </h2>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <CapitalScoreGauge score={d.score} />
          <div className="flex-1 w-full">
            <ScoreBreakdown
              asset_stability={d.asset_stability}
              goal_progress={d.goal_progress}
              routine_score={d.routine_score}
            />
          </div>
        </div>
      </Card>

      {/* 핵심 질문 */}
      <KeyQuestion question={d.key_question} />

      {/* 오늘 할 행동 */}
      <Card className="mt-4">
        <TodayActions actions={d.today_actions} onToggle={handleToggleAction} />
      </Card>
    </PageContainer>
  );
}
