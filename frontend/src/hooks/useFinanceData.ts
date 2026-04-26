// frontend/src/hooks/useFinanceData.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { journalToFinanceEvent } from "@/lib/financeUtils";
import type { FinanceEvent, JournalEntry } from "@/lib/types";

type CategoryFilter = "전체" | "주식" | "부동산";

export interface DartDisclosure {
  corp_name: string;
  report_nm: string;
  rcept_dt:  string;
}

/**
 * Finance Intelligence 화면의 데이터를 관리하는 훅.
 *
 * Returns:
 *   events          - 필터된 FinanceEvent 목록 (일지 기반)
 *   dartResults     - DART 공시 검색 결과
 *   loading         - 초기 로딩
 *   dartLoading     - DART 검색 중
 *   searchDart(q)   - DART 종목명 검색 실행
 *   activeCategory  - 현재 선택된 카테고리
 *   setCategory     - 카테고리 변경
 */
export function useFinanceData() {
  const [allEvents, setAllEvents]           = useState<FinanceEvent[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("전체");
  const [loading, setLoading]               = useState(true);
  const [dartResults, setDartResults]       = useState<DartDisclosure[]>([]);
  const [dartLoading, setDartLoading]       = useState(false);

  useEffect(() => {
    async function loadJournals() {
      setLoading(true);
      try {
        const [inv, hou] = await Promise.allSettled([
          api.get<JournalEntry[]>("/journals?category=investment"),
          api.get<JournalEntry[]>("/journals?category=housing"),
        ]);

        const invJournals = inv.status === "fulfilled" ? inv.value : [];
        const houJournals = hou.status === "fulfilled" ? hou.value : [];

        const events = [
          ...invJournals.slice(0, 5),
          ...houJournals.slice(0, 5),
        ]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8)
          .map(journalToFinanceEvent);

        setAllEvents(events);
      } catch {
        // 로딩 실패 시 빈 배열 유지
      } finally {
        setLoading(false);
      }
    }
    loadJournals();
  }, []);

  const events =
    activeCategory === "전체"
      ? allEvents
      : allEvents.filter((e) => e.type === activeCategory);

  const searchDart = useCallback(async (corpName: string) => {
    if (!corpName.trim()) {
      setDartResults([]);
      return;
    }
    setDartLoading(true);
    try {
      const res = await fetch(
        `/api/public-data/dart?corp_name=${encodeURIComponent(corpName)}`,
      );
      const json = await res.json();
      setDartResults((json?.data ?? []).slice(0, 3));
    } catch {
      setDartResults([]);
    } finally {
      setDartLoading(false);
    }
  }, []);

  return {
    events,
    dartResults,
    loading,
    dartLoading,
    searchDart,
    activeCategory,
    setCategory: setActiveCategory,
  };
}
