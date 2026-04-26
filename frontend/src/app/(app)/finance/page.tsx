// frontend/src/app/(app)/finance/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FinanceEventCard from "@/components/finance/FinanceEventCard";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useMeasureMode } from "@/lib/measureModeContext";

const CATEGORY_TABS = ["전체", "주식", "부동산"] as const;
type CategoryTab = (typeof CATEGORY_TABS)[number];

const FINANCE_CATEGORIES: Array<{
  label: string;
  desc:  string;
  filter: CategoryTab;
}> = [
  { label: "주식",      desc: "가격 변동 이유와 투자 가설",  filter: "주식"   },
  { label: "부동산",    desc: "실거래가와 주거 의사결정",    filter: "부동산" },
  { label: "금리·환율", desc: "현금흐름과 시장 환경",       filter: "전체"   },
  { label: "공시",      desc: "DART 기반 기업 이벤트",      filter: "전체"   },
];

function CategoryIcon({ name }: { name: string }) {
  if (name === "주식") return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[17px] w-[17px]"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-4 3 3 5-7"/>
    </svg>
  );
  if (name === "부동산") return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[17px] w-[17px]"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>
    </svg>
  );
  if (name === "금리·환율") return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[17px] w-[17px]"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>
      <path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>
    </svg>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-[17px] w-[17px]"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <ellipse cx="12" cy="5" rx="8" ry="3"/>
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>
    </svg>
  );
}

export default function FinancePage() {
  const { measureMode } = useMeasureMode();
  const {
    events,
    dartResults,
    loading,
    dartLoading,
    searchDart,
    activeCategory,
    setCategory,
  } = useFinanceData();

  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      searchDart(searchQuery);
    }
  }

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
          {"투자·주거 일지 기반으로 의사결정 맥락을 정리해요.\n가격이 왜 움직였는지 나의 기록과 연결합니다."}
        </p>
      </div>

      {/* 카테고리 탭 (필터) */}
      <div className="mb-4 flex gap-2">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={[
              "rounded-full px-4 py-2 text-sm font-black transition-all",
              activeCategory === cat
                ? "bg-[#2563EB] text-white"
                : "bg-white border border-[var(--color-border)] text-slate-500 hover:border-[#2563EB]",
            ].join(" ")}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 카테고리 그리드 */}
      <section className="mb-4 grid grid-cols-2 gap-2.5">
        {FINANCE_CATEGORIES.map((item) => (
          <Card
            key={item.label}
            padding="sm"
            interactive
            onClick={() => setCategory(item.filter)}
            className={
              activeCategory === item.filter && item.filter !== "전체"
                ? "border-[#2563EB] ring-1 ring-[#2563EB]"
                : ""
            }
          >
            <div className="mb-3 grid h-9 w-9 place-items-center
                            rounded-[var(--radius-2xl)] bg-[#2563EB]/10 text-[#2563EB]">
              <CategoryIcon name={item.label} />
            </div>
            <p className="text-base font-black text-[#0B132B]">{item.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
          </Card>
        ))}
      </section>

      {/* 검색 카드 — Enter로 DART 검색 */}
      <Card className="relative mb-4 overflow-hidden p-4">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#2563EB]" />
        <label className="relative block">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3-3" />
            </svg>
          </span>
          <input
            className="h-14 w-full rounded-[var(--radius-2xl)] border border-slate-200
                       bg-slate-50 py-3 pl-12 pr-4 text-base font-bold text-[#0B132B]
                       outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="종목명 입력 후 Enter → DART 공시 검색"
          />
        </label>
      </Card>

      {/* DART 공시 검색 결과 */}
      {(dartLoading || dartResults.length > 0) && (
        <Card className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-[#0B132B]">DART 공시 검색 결과</h2>
            <button
              onClick={() => { setSearchQuery(""); searchDart(""); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              닫기
            </button>
          </div>
          {dartLoading ? (
            <p className="text-xs text-slate-500">검색 중...</p>
          ) : dartResults.length === 0 ? (
            <p className="text-xs text-slate-500">검색 결과가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dartResults.map((d, i) => (
                <div key={i}
                     className="flex items-start justify-between rounded-[var(--radius-lg)] bg-slate-50 p-3">
                  <div>
                    <p className="text-xs font-black text-[#0B132B]">{d.corp_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-4">{d.report_nm}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">{d.rcept_dt}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[10px] text-slate-400">
            출처: 금융감독원 OPEN DART · 이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다.
          </p>
        </Card>
      )}

      {/* 이벤트 카드 목록 — 일지 기반 */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-[#0B132B]">
            {activeCategory === "전체" ? "내 의사결정 기록" : `${activeCategory} 기록`}
          </h2>
          {!loading && events.length > 0 && (
            <span className="text-xs text-slate-400">{events.length}건</span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-[var(--radius-2xl)] bg-slate-100" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card variant="outlined" className="py-12 text-center">
            <p className="text-sm text-slate-500">
              {activeCategory !== "전체"
                ? `${activeCategory} 카테고리의 일지가 없어요.`
                : "아직 투자·주거 일지가 없어요."}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              일지를 작성하면 AI가 의사결정 맥락을 정리해줍니다.
            </p>
            <Link href="/journal/new" className="mt-4 inline-block">
              <Button variant="primary" size="sm">첫 일지 작성하기</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event, i) => (
              <FinanceEventCard
                key={event.id}
                event={event}
                measureMode={measureMode}
                index={i}
              />
            ))}
          </div>
        )}
      </div>

      {/* ORNEO AI NOTE */}
      <Card className="mb-4 bg-[#0B132B] p-5 text-white">
        <p className="text-xs font-black tracking-wide text-[#00C2A8]">ORNEO AI NOTE</p>
        <p className="mt-2 whitespace-pre-line text-sm text-white/80">
          {"이 화면은 종목 추천 화면이 아닙니다.\n나의 일지와 AI 요약으로 의사결정 맥락을 복기하고\n투자 가설을 더 명확하게 만드는 화면입니다."}
        </p>
        <p className="mt-2 text-[10px] text-white/50">
          이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다.
        </p>
      </Card>

      {/* 목표 관리 진입 */}
      <Card variant="outlined" className="py-6 text-center">
        <p className="text-xs text-slate-500">금융·주거·학습 목표 관리</p>
        <Link href="/goals">
          <Button variant="ghost" size="sm" className="mt-2">목표 관리하기 →</Button>
        </Link>
      </Card>
    </PageContainer>
  );
}
