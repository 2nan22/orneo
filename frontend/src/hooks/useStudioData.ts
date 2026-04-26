// frontend/src/hooks/useStudioData.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DecisionScenarioData, StudioJournal } from "@/lib/types";

/**
 * Studio 화면에서 필요한 investment·housing 일지 목록과 점수 지표를 반환하는 훅.
 *
 * Returns:
 *   journals            - investment + housing 카테고리 일지 최신 10건
 *   metrics             - 현금흐름·기회비용 지표 (대출부담, 학습시간)
 *   loading             - 로딩 상태
 *   requestScenario(id) - 특정 일지에 대한 시나리오 온디맨드 요청
 *   scenarioLoading     - 시나리오 생성 중 상태 (journal_id → boolean)
 */
export function useStudioData() {
  const [journals, setJournals] = useState<StudioJournal[]>([]);
  const [metrics, setMetrics] = useState({ loanBurden: 0, learningTime: 0 });
  const [loading, setLoading] = useState(true);
  const [scenarioLoading, setScenarioLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [invJournals, houJournals, dashboard] = await Promise.allSettled([
          api.get<StudioJournal[]>("/journals/?category=investment"),
          api.get<StudioJournal[]>("/journals/?category=housing"),
          api.get<{ asset_stability: number; routine_score: number }>("/dashboard/"),
        ]);

        const inv = invJournals.status === "fulfilled" ? invJournals.value : [];
        const hou = houJournals.status === "fulfilled" ? houJournals.value : [];
        const merged = [...inv, ...hou]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        setJournals(merged);

        if (dashboard.status === "fulfilled") {
          const d = dashboard.value;
          setMetrics({
            loanBurden: Math.round(100 - d.asset_stability),
            learningTime: Math.round(d.routine_score),
          });
        }
      } catch {
        // 로딩 실패 시 빈 배열 유지
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /** 특정 일지의 시나리오를 온디맨드 생성/조회한다. */
  const requestScenario = useCallback(async (journalId: number): Promise<void> => {
    setScenarioLoading((prev) => ({ ...prev, [journalId]: true }));
    try {
      const result = await api.post<DecisionScenarioData>(`/journals/${journalId}/scenarios/`);
      setJournals((prev) =>
        prev.map((j) =>
          j.id === journalId ? { ...j, decision_scenario: result } : j,
        ),
      );
    } catch {
      // 시나리오 생성 실패 — UI는 기존 상태 유지
    } finally {
      setScenarioLoading((prev) => ({ ...prev, [journalId]: false }));
    }
  }, []);

  return { journals, metrics, loading, scenarioLoading, requestScenario };
}
