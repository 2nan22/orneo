// frontend/src/app/(app)/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageContainer from "@/components/ui/PageContainer";
import HeroScoreCard from "@/components/dashboard/HeroScoreCard";
import GoalGrid from "@/components/dashboard/GoalGrid";
import KeyQuestion from "@/components/dashboard/KeyQuestion";
import TodayActions from "@/components/dashboard/TodayActions";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import ApartmentCard from "@/components/dashboard/ApartmentCard";
import OrneoAiPanel from "@/components/dashboard/OrneoAiPanel";
import { api } from "@/lib/api";
import { useMeasureMode } from "@/lib/measureModeContext";
import type { DashboardData, UserProfile } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData]           = useState<DashboardData | null>(null);
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isError, setIsError]     = useState(false);
  const { measureMode } = useMeasureMode();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      const res = await api.get<DashboardData>("/dashboard");
      setData(res);
    } catch {
      setIsError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    api.get<UserProfile>("/auth/profile")
      .then(setProfile)
      .catch(() => {});
  }, [fetchDashboard]);

  async function handleToggleAction(id: number, completed: boolean) {
    await api.patch("/dashboard", { action_id: id, completed });
  }

  if (loading) {
    return (
      <PageContainer size="lg">
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer size="lg">
        <Card variant="outlined" className="py-12 text-center">
          <p className="text-sm text-[var(--color-danger)]">
            대시보드를 불러오지 못했습니다.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            className="mt-4"
          >
            다시 시도
          </Button>
        </Card>
      </PageContainer>
    );
  }

  const d = data!;

  return (
    <PageContainer size="lg">
      {/* 페이지 헤더 */}
      <div className="mb-4">
        <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">LIFE CAPITAL OS</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">오늘의 대시보드</h1>
      </div>

      {/*
        모바일: flex-col — HeroScoreCard → TodayActions → GoalGrid → KeyQuestion → OrneoAiPanel → 빠른 이동 → 실거래가
        데스크톱(sm+): 2컬럼 그리드
          col 1: HeroScoreCard (row1), GoalGrid (row2), 빠른 이동 (row3)
          col 2: TodayActions (row1), KeyQuestion (row2)
      */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_360px] sm:gap-6">

        {/* 1. 히어로 점수 카드 — 모바일 1번째 / 데스크톱 col 1 row 1 */}
        <HeroScoreCard
          score={d.score}
          measureMode={measureMode}
          className="sm:col-start-1 sm:row-start-1"
        />

        {/* 2. 오늘 할 행동 — 모바일 2번째 / 데스크톱 col 2 row 1 */}
        {d.today_actions.length === 0 ? (
          <Card
            variant="outlined"
            className="py-8 text-center sm:col-start-2 sm:row-start-1"
          >
            <p className="text-sm text-[var(--color-text-sub)]">
              오늘의 행동이 아직 없어요.
            </p>
            <Link href="/goals" className="mt-3 inline-block">
              <Button variant="point" size="sm">목표에서 행동 추가하기 →</Button>
            </Link>
          </Card>
        ) : (
          <Card className="sm:col-start-2 sm:row-start-1">
            <TodayActions actions={d.today_actions} onToggle={handleToggleAction} />
          </Card>
        )}

        {/* 3. MetricCard (GoalGrid) — 모바일 3번째 / 데스크톱 col 1 row 2 */}
        <Card className="sm:col-start-1 sm:row-start-2">
          <GoalGrid
            assetStability={d.asset_stability}
            goalProgress={d.goal_progress}
            routineScore={d.routine_score}
            delta={d.delta}
            measureMode={measureMode}
          />
        </Card>

        {/* 4. 오늘의 핵심 질문 — 모바일 4번째 / 데스크톱 col 2 row 2 */}
        {d.key_question && (
          <div className="sm:col-start-2 sm:row-start-2">
            <KeyQuestion question={d.key_question} />
          </div>
        )}

        {/* 5. ORNEO AI 패널 — 전폭 */}
        <div className="sm:col-span-2">
          <OrneoAiPanel />
        </div>

        {/* 6. 빠른 이동 — 모바일 6번째 / 데스크톱 col 1 row 3 */}
        <Card variant="outlined" className="sm:col-start-1 sm:row-start-3">
          <p className="text-sm font-semibold text-[var(--color-text-sub)]">빠른 이동</p>
          <div className="mt-3 flex gap-2">
            <Link href="/journal" className="flex-1">
              <Button variant="outline" size="sm" fullWidth>의사결정 일지 →</Button>
            </Link>
            <Link href="/reports" className="flex-1">
              <Button variant="outline" size="sm" fullWidth>주간 리포트 →</Button>
            </Link>
          </div>
        </Card>

        {/* 7. 실거래가 카드 — 항상 표시 */}
        <div className="sm:col-span-2">
          <ApartmentCard initialCode={profile?.preferred_region_code ?? ""} />
        </div>

      </div>
    </PageContainer>
  );
}
