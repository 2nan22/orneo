// frontend/src/app/(app)/goals/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Goal, GoalCategory } from "@/lib/types";
import GoalCard from "@/components/goals/GoalCard";
import GoalCreateModal from "@/components/goals/GoalCreateModal";
import PageContainer from "@/components/ui/PageContainer";

type CategoryFilter = "all" | GoalCategory;

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "finance", label: "금융" },
  { value: "housing", label: "주거" },
  { value: "learning", label: "학습" },
  { value: "routine", label: "루틴" },
];

const MOCK_GOALS: Goal[] = [
  {
    id: 1,
    title: "비상금 1천만 원 달성",
    description: null,
    category: "finance",
    target_amount: 10000000,
    target_date: "2025-12-31",
    progress: 0.62,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    title: "분당 아파트 청약 준비",
    description: "청약 통장 납입 2년 달성",
    category: "housing",
    target_amount: null,
    target_date: "2025-06-30",
    progress: 0.45,
    created_at: "2025-01-15T00:00:00Z",
  },
  {
    id: 3,
    title: "K-MOOC 금융 과정 수료",
    description: null,
    category: "learning",
    target_amount: null,
    target_date: "2025-03-01",
    progress: 0.8,
    created_at: "2025-02-01T00:00:00Z",
  },
  {
    id: 4,
    title: "주 3회 운동 루틴",
    description: null,
    category: "routine",
    target_amount: null,
    target_date: null,
    progress: 0.33,
    created_at: "2025-02-10T00:00:00Z",
  },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [showModal, setShowModal] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?category=${filter}` : "";
      const data = await api.get<Goal[]>(`/goals/${params}`);
      setGoals(data);
    } catch {
      setGoals(MOCK_GOALS);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const displayed =
    filter === "all" ? goals : goals.filter((g) => g.category === filter);

  return (
    <PageContainer size="md">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">목표 관리</h1>
      </div>

      {/* Category tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto">
        {CATEGORY_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all",
              filter === value
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-card)] text-[var(--color-text-sub)] hover:bg-[var(--color-border)]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Goal list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <span className="text-sm text-[var(--color-text-sub)]">불러오는 중...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-sub)]">목표가 없습니다.</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            첫 번째 목표를 만들어보세요
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-8"
        aria-label="목표 추가"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {showModal && (
        <GoalCreateModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchGoals();
          }}
        />
      )}
    </PageContainer>
  );
}
