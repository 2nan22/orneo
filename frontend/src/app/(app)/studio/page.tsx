// frontend/src/app/(app)/studio/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Progress from "@/components/ui/Progress";
import LevelDots from "@/components/ui/LevelDots";
import type { MeasureMode } from "@/components/ui/MeasurementToggle";

const FLOW_STEPS = [
  "개인 메모를 먼저 요약합니다.",
  "실거래가와 공시 데이터를 조회합니다.",
  "최신 뉴스와 정책 변화를 검색합니다.",
  "근거가 약한 결론은 보류합니다.",
];

const METRICS = [
  { label: "대출 부담", value: 65, tone: "red" as const },
  { label: "학습 시간 보존", value: 82, tone: "green" as const },
];

export default function StudioPage() {
  const [measureMode] = useState<MeasureMode>("score");
  const [query, setQuery] = useState("성동구 전세 vs 외곽 매수?");

  return (
    <PageContainer size="md">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">
          DECISION STUDIO
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">
          선택을 시뮬레이션하세요
        </h1>
        <p className="mt-2 whitespace-pre-line text-sm text-[#334155]">
          {"돈, 시간, 집중력, 커리어 성장을 함께 비교해요.\nORNEO AI가 필요한 도구와 데이터를 조합합니다."}
        </p>
      </div>

      {/* 검색 입력 카드 */}
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
                       outline-none focus:border-[#2563EB] focus:ring-2
                       focus:ring-[#2563EB]/20"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="어떤 의사결정을 시뮬레이션할까요?"
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

      {/* 현금흐름·기회비용 */}
      <Card className="mb-4">
        <h2 className="mb-4 text-base font-black text-[#0B132B]">현금흐름·기회비용</h2>
        <div className="space-y-5">
          {METRICS.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-bold text-slate-500">{item.label}</span>
                <span className="font-black">
                  {measureMode === "score" ? `${item.value}%` : item.value}
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
      </Card>

      {/* Decision Studio 결과 영역 */}
      <Card variant="outlined" className="mb-4 py-10 text-center">
        <p className="text-sm font-bold text-[#0B132B]">의사결정 일지와 연결하세요</p>
        <p className="mt-2 text-xs text-slate-500">
          일지를 작성하면 ORNEO AI가 A/B/C 시나리오를 자동 생성합니다.
        </p>
        <Link href="/journal/new" className="mt-4 inline-block">
          <Button variant="primary" size="sm">새 일지 작성하기</Button>
        </Link>
      </Card>

      {/* 일지 목록 진입 경로 */}
      <Card variant="outlined" className="py-6 text-center">
        <p className="text-xs text-slate-500">의사결정 일지 전체 목록</p>
        <Link href="/journal">
          <Button variant="ghost" size="sm" className="mt-2">일지 목록 보기 →</Button>
        </Link>
      </Card>
    </PageContainer>
  );
}
