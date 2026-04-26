// frontend/src/app/(app)/finance/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FinanceEventCard from "@/components/finance/FinanceEventCard";
import { useMeasureMode } from "@/lib/measureModeContext";

const FINANCE_CATEGORIES = [
  { label: "주식",      desc: "가격 변동 이유와 투자 가설",  icon: "growth"   },
  { label: "부동산",    desc: "실거래가와 주거 의사결정",    icon: "home"     },
  { label: "금리·환율", desc: "현금흐름과 시장 환경",       icon: "globe"    },
  { label: "공시",      desc: "DART 기반 기업 이벤트",      icon: "database" },
];

// mock — 추후 /api/public-data/* + AI service 연동
const FINANCE_EVENTS = [
  {
    title:     "삼성전자",
    type:      "주식" as const,
    move:      "하락 이후 회복 탐색",
    context:   "메모리 업황 우려, 외국인 수급, HBM 경쟁력 논쟁이 가격에 반영됐어요.",
    direction: "단기 반등보다 실적 추정치와 AI 반도체 경쟁력 회복을 확인해요.",
    value:     72,
  },
  {
    title:     "성동구 아파트",
    type:      "부동산" as const,
    move:      "전세가율 상승",
    context:   "매매 관망과 전세 수요가 겹치며 현금흐름 부담이 커졌어요.",
    direction: "매수 여부보다 12개월 현금 확보와 대체 지역 비교가 먼저예요.",
    value:     81,
  },
  {
    title:     "미국 금리 경로",
    type:      "금리·환율" as const,
    move:      "기대 변화",
    context:   "인플레이션 둔화 속도와 고용 지표에 따라 위험자산 선호가 흔들렸어요.",
    direction: "현금, 주식, 부동산의 비중을 한 번에 조정하기보다 단계적으로 봐요.",
    value:     68,
  },
];

function CategoryIcon({ name }: { name: string }) {
  if (name === "home")
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-[17px] w-[17px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  if (name === "growth")
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-[17px] w-[17px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M7 15l4-4 3 3 5-7" />
      </svg>
    );
  if (name === "globe")
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-[17px] w-[17px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
      </svg>
    );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-[17px] w-[17px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

export default function FinancePage() {
  const { measureMode } = useMeasureMode();
  const [searchQuery, setSearchQuery] = useState("삼성전자 · 최근 18개월 변동 이유");

  return (
    <PageContainer size="md">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">
          FINANCE INTELLIGENCE
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">
          금융 정보를 종합합니다
        </h1>
        <p className="mt-2 whitespace-pre-line text-sm text-[#334155]">
          {"주식, 부동산, 금리, 환율, 공시를 함께 봅니다.\n가격이 왜 움직였는지 과거 사건과 뉴스를 연결하고\n앞으로의 투자 방향성을 정리합니다."}
        </p>
      </div>

      {/* 카테고리 2×2 그리드 */}
      <section className="mb-4 grid grid-cols-2 gap-2.5">
        {FINANCE_CATEGORIES.map((item) => (
          <Card key={item.label} padding="sm">
            <div
              className="mb-3 grid h-9 w-9 place-items-center
                          rounded-[var(--radius-2xl)] bg-[#2563EB]/10 text-[#2563EB]"
            >
              <CategoryIcon name={item.icon} />
            </div>
            <p className="text-base font-black text-[#0B132B]">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
          </Card>
        ))}
      </section>

      {/* 검색 카드 */}
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="종목명, 지역, 이슈를 검색해보세요"
          />
        </label>
      </Card>

      {/* 이벤트 카드 목록 */}
      <section className="mb-4 space-y-3">
        {FINANCE_EVENTS.map((event, i) => (
          <FinanceEventCard
            key={event.title}
            event={event}
            measureMode={measureMode}
            index={i}
          />
        ))}
      </section>

      {/* ORNEO AI NOTE */}
      <Card className="mb-4 bg-[#0B132B] p-5 text-white">
        <p className="text-xs font-black tracking-wide text-[#00C2A8]">ORNEO AI NOTE</p>
        <p className="mt-2 whitespace-pre-line text-sm text-white/80">
          {"이 화면은 종목 추천 화면이 아닙니다.\n가격 변동의 원인을 복기하고\n사용자의 투자 가설을 더 명확하게 만드는 화면입니다."}
        </p>
      </Card>

      {/* 목표 관리 진입 경로 */}
      <Card variant="outlined" className="py-6 text-center">
        <p className="text-xs text-slate-500">금융·주거·학습 목표 관리</p>
        <Link href="/goals">
          <Button variant="ghost" size="sm" className="mt-2">목표 관리하기 →</Button>
        </Link>
      </Card>
    </PageContainer>
  );
}
