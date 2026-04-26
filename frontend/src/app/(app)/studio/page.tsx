// frontend/src/app/(app)/studio/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Progress from "@/components/ui/Progress";
import LevelDots from "@/components/ui/LevelDots";
import DecisionStudio from "@/components/journal/DecisionStudio";
import StudioJournalCard from "@/components/studio/StudioJournalCard";
import { useStudioData } from "@/hooks/useStudioData";
import { useMeasureMode } from "@/lib/measureModeContext";
import type { StudioJournal } from "@/lib/types";

const FLOW_STEPS = [
  "개인 메모를 먼저 요약합니다.",
  "실거래가와 공시 데이터를 조회합니다.",
  "최신 뉴스와 정책 변화를 검색합니다.",
  "근거가 약한 결론은 보류합니다.",
];

export default function StudioPage() {
  const { measureMode } = useMeasureMode();
  const { journals, metrics, loading, scenarioLoading, requestScenario } = useStudioData();
  const [query, setQuery] = useState("");
  const [selectedJournal, setSelectedJournal] = useState<StudioJournal | null>(null);

  const filteredJournals = useMemo(() => {
    if (!query.trim()) return journals;
    const q = query.toLowerCase();
    return journals.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.dart_corp_name.toLowerCase().includes(q),
    );
  }, [journals, query]);

  function handleSelectJournal(journal: StudioJournal) {
    setSelectedJournal((prev) => (prev?.id === journal.id ? null : journal));
  }

  return (
    <PageContainer size="md">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">DECISION STUDIO</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">
          선택을 시뮬레이션하세요
        </h1>
        <p className="mt-2 whitespace-pre-line text-sm text-[#334155]">
          {"돈, 시간, 집중력, 커리어 성장을 함께 비교해요.\nORNEO AI가 필요한 도구와 데이터를 조합합니다."}
        </p>
      </div>

      {/* 검색 */}
      <Card className="relative mb-4 overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2563EB] to-[#00C2A8]" />
        <label className="relative block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
          </span>
          <input
            className="h-14 w-full rounded-[var(--radius-2xl)] border border-slate-200
                       bg-slate-50 py-3 pl-12 pr-4 text-base font-bold text-[#0B132B]
                       outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명, 지역, 의사결정 주제로 검색"
          />
        </label>
      </Card>

      {/* 근거 수집 흐름 */}
      <Card className="mb-4">
        <h2 className="mb-4 text-base font-black text-[#0B132B]">근거 수집 흐름</h2>
        <div className="space-y-2">
          {FLOW_STEPS.map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-3 rounded-[var(--radius-2xl)] bg-slate-50 p-3"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center
                           rounded-[var(--radius-lg)] bg-white
                           text-xs font-black text-[#2563EB]"
              >
                {i + 1}
              </span>
              <span className="text-sm font-bold leading-5 text-slate-700">{step}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 현금흐름·기회비용 — 실값 */}
      <Card className="mb-4">
        <h2 className="mb-4 text-base font-black text-[#0B132B]">현금흐름·기회비용</h2>
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 rounded bg-slate-100" />
            <div className="h-4 rounded bg-slate-100" />
          </div>
        ) : (
          <div className="space-y-5">
            {[
              { label: "대출 부담", value: metrics.loanBurden, tone: "red" as const },
              { label: "학습 시간 보존", value: metrics.learningTime, tone: "green" as const },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-bold text-slate-500">{item.label}</span>
                  <span className="font-black text-[#0B132B]">
                    {measureMode === "score" ? `${item.value}%` : `${item.value}점`}
                  </span>
                </div>
                {measureMode === "score" ? (
                  <Progress value={item.value} tone={item.tone} />
                ) : (
                  <LevelDots value={item.value} />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 일지 목록 */}
      <div className="mb-4">
        <h2 className="mb-3 text-base font-black text-[#0B132B]">최근 의사결정 일지</h2>
        {loading ? (
          <div className="flex animate-pulse flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-[var(--radius-2xl)] bg-slate-100" />
            ))}
          </div>
        ) : filteredJournals.length === 0 ? (
          <Card variant="outlined" className="py-10 text-center">
            <p className="text-sm text-slate-500">
              {query ? "검색 결과가 없습니다." : "투자·주거 일지가 아직 없어요."}
            </p>
            <Link href="/journal/new" className="mt-3 inline-block">
              <Button variant="primary" size="sm">첫 일지 작성하기</Button>
            </Link>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredJournals.map((journal) => (
              <StudioJournalCard
                key={journal.id}
                journal={journal}
                isSelected={selectedJournal?.id === journal.id}
                isLoading={scenarioLoading[journal.id] ?? false}
                onSelect={handleSelectJournal}
                onRequestScenario={requestScenario}
              />
            ))}
          </div>
        )}
      </div>

      {/* 선택된 일지의 DecisionStudio */}
      {selectedJournal?.decision_scenario && (
        <div className="mb-4">
          <h2 className="mb-3 text-base font-black text-[#0B132B]">AI 시나리오 분석</h2>
          <DecisionStudio
            topic={selectedJournal.decision_scenario.topic}
            evidenceChips={selectedJournal.decision_scenario.evidence_chips}
            scenarios={selectedJournal.decision_scenario.scenarios}
            disclaimer={selectedJournal.decision_scenario.disclaimer}
          />
        </div>
      )}

      {/* 하단 CTA */}
      <div className="flex flex-col gap-3">
        <Link href="/journal/new">
          <Button variant="primary" size="md" fullWidth>새 일지 작성하기</Button>
        </Link>
        <Link href="/journal">
          <Button variant="ghost" size="sm" fullWidth>일지 전체 목록 →</Button>
        </Link>
      </div>
    </PageContainer>
  );
}
