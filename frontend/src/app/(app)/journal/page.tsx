// frontend/src/app/(app)/journal/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import CategoryTabs, { type CategoryFilter } from "@/components/journal/CategoryTabs";
import JournalCard from "@/components/journal/JournalCard";
import ReviewModal from "@/components/journal/ReviewModal";
import { api } from "@/lib/api";
import type { JournalEntry } from "@/lib/types";

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: 1,
    category: "investment",
    title: "삼성전자 분할 매수 검토",
    content: "실거래가 하락세 반전 확인, 분할 매수 검토 중",
    ai_summary: "하락 반전 신호를 포착하여 분할 매수를 고려 중. 리스크 관리를 위해 단계적 접근이 적절.",
    mood_score: 4,
    is_reviewed: false,
    review_memo: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    related_goal: null,
  },
  {
    id: 2,
    category: "housing",
    title: "마포구 아파트 시세 조사",
    content: "실거래가 API 통해 최근 3개월 시세 확인",
    ai_summary: null,
    mood_score: 3,
    is_reviewed: true,
    review_memo: "매수 타이밍은 조금 더 관망",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    related_goal: null,
  },
];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [reviewTarget, setReviewTarget] = useState<JournalEntry | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJournals = useCallback(async (cat: CategoryFilter) => {
    try {
      const params = cat !== "all" ? `?category=${cat}` : "";
      const data = await api.get<JournalEntry[]>(`/journals${params}`);
      setEntries(data);
    } catch {
      setEntries(MOCK_ENTRIES);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드 + 카테고리 변경 시 재로드
  useEffect(() => {
    setLoading(true);
    fetchJournals(category);
  }, [category, fetchJournals]);

  // AI 요약 생성 중인 항목이 있으면 5초 폴링
  useEffect(() => {
    const hasUnresolved = entries.some((e) => e.ai_summary === null);
    if (hasUnresolved) {
      pollingRef.current = setInterval(() => fetchJournals(category), 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [entries, category, fetchJournals]);

  async function handleReviewSave(id: number, memo: string) {
    await api.patch(`/journals/${id}/review/`, { review_memo: memo });
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, is_reviewed: true, review_memo: memo } : e,
      ),
    );
    setReviewTarget(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">의사결정 일지</h1>
        <Link href="/journal/new">
          <Button>새 일지 작성</Button>
        </Link>
      </div>

      <div className="mb-4">
        <CategoryTabs active={category} onChange={setCategory} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <span className="text-sm text-[var(--color-text-sub)]">불러오는 중...</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-[var(--color-card)] px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-[var(--color-text-sub)]">작성된 일지가 없습니다.</p>
          <Link href="/journal/new" className="mt-3 inline-block">
            <Button variant="outline" className="mt-3">첫 일지 작성하기</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onReview={setReviewTarget}
            />
          ))}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          entry={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSave={(memo) => handleReviewSave(reviewTarget.id, memo)}
        />
      )}
    </div>
  );
}
