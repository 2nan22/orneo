// frontend/src/components/dashboard/ApartmentCard.tsx
"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { REGION_GROUPS, REGION_LIST, REGION_MAP, type RegionOption } from "@/lib/regionList";

interface Transaction {
  deal_amount: number;
  area: number;
  floor: number;
  deal_date: string;
  apartment_name: string;
  legal_dong: string;
}

interface Props {
  /** 프로필에 저장된 법정동코드 (없으면 빈 문자열) */
  initialCode?: string;
}

const PROPERTY_TYPES = [
  { key: "apt",  label: "아파트" },
  { key: "offi", label: "오피스텔" },
  { key: "rh",   label: "연립·다세대" },
  { key: "sh",   label: "단독·다가구" },
] as const;
type PropertyType = typeof PROPERTY_TYPES[number]["key"];

function prevMonth(y: number, m: number): [number, number] {
  return m === 1 ? [y - 1, 12] : [y, m - 1];
}

function nextMonth(y: number, m: number): [number, number] {
  return m === 12 ? [y + 1, 1] : [y, m + 1];
}

function toYmd(y: number, m: number): string {
  return `${y}${String(m).padStart(2, "0")}`;
}

function formatKrwMan(manwon: number): string {
  if (manwon <= 0) return "0만";
  const eok = Math.floor(manwon / 10000);
  const man = manwon % 10000;
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString("ko-KR")}만`;
  if (eok > 0) return `${eok}억`;
  return `${man.toLocaleString("ko-KR")}만`;
}

export default function ApartmentCard({ initialCode = "" }: Props) {
  const now = new Date();
  const maxYear  = now.getFullYear();
  const maxMonth = now.getMonth() + 1;

  const initDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [selectedRegion, setSelectedRegion] = useState<RegionOption | null>(
    () => REGION_MAP.get(initialCode) ?? null,
  );
  const [year,         setYear]         = useState(initDate.getFullYear());
  const [month,        setMonth]        = useState(initDate.getMonth() + 1);
  const [propertyType, setPropertyType] = useState<PropertyType>("apt");
  const [page,         setPage]         = useState(1);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [apiError,     setApiError]     = useState<string | null>(null);

  const isAtMax   = year === maxYear && month === maxMonth;
  const totalPages = Math.max(1, Math.ceil(totalCount / 10));

  useEffect(() => {
    const found = REGION_MAP.get(initialCode);
    if (found) setSelectedRegion(found);
  }, [initialCode]);

  useEffect(() => {
    if (!selectedRegion) return;

    setLoading(true);
    setTransactions([]);
    setApiError(null);

    fetch(
      `/api/public-data/apartments?lawd_cd=${selectedRegion.code}&deal_ymd=${toYmd(year, month)}&type=${propertyType}&page=${page}`,
    )
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || json.status === "error") {
          setApiError(json.message ?? "API 오류가 발생했습니다.");
          setTransactions([]);
          setTotalCount(0);
        } else {
          setTransactions(json?.data ?? []);
          setTotalCount(json?.total_count ?? 0);
        }
      })
      .catch(() => setApiError("서버에 연결할 수 없습니다."))
      .finally(() => setLoading(false));
  }, [selectedRegion, year, month, propertyType, page]);

  function handlePrev() {
    const [ny, nm] = prevMonth(year, month);
    setYear(ny);
    setMonth(nm);
    setPage(1);
  }

  function handleNext() {
    if (isAtMax) return;
    const [ny, nm] = nextMonth(year, month);
    setYear(ny);
    setMonth(nm);
    setPage(1);
  }

  return (
    <Card padding="md">
      {/* 컨트롤 바: 지역 + 연월 */}
      <div className="mb-2 flex items-center gap-2">
        <select
          value={selectedRegion?.code ?? ""}
          onChange={(e) => {
            setSelectedRegion(REGION_MAP.get(e.target.value) ?? null);
            setPage(1);
          }}
          className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)]
                     bg-white px-3 py-1.5 text-xs text-[var(--color-text)]
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        >
          <option value="">지역 선택</option>
          {REGION_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {REGION_LIST.filter((r) => r.group === group).map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)]
                       border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]
                       hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
                       transition-colors"
            aria-label="이전 달"
          >
            ‹
          </button>
          <span className="w-[72px] text-center text-[11px] font-medium text-[var(--color-text)]">
            {year}년 {month}월
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={isAtMax}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)]
                       border border-[var(--color-border)] text-xs text-[var(--color-text-sub)]
                       hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
                       disabled:cursor-not-allowed disabled:opacity-30
                       transition-colors"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>
      </div>

      {/* 유형 필터 뱃지 */}
      <div className="mb-3 flex flex-wrap gap-1">
        {PROPERTY_TYPES.map((pt) => (
          <button
            key={pt.key}
            type="button"
            onClick={() => { setPropertyType(pt.key); setPage(1); }}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
              propertyType === pt.key
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[var(--color-border)] bg-white text-[var(--color-text-sub)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            }`}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* 데이터 영역 */}
      {!selectedRegion ? (
        <p className="py-6 text-center text-xs text-[var(--color-text-sub)]">
          지역을 선택하면 실거래가를 확인할 수 있습니다.
        </p>
      ) : loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      ) : apiError ? (
        <p className="py-6 text-center text-xs text-[var(--color-danger)]">
          {apiError}
        </p>
      ) : transactions.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--color-text-sub)]">
          해당 월 거래 내역이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {transactions.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg
                         bg-[var(--color-bg)] px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium text-[var(--color-text)]">
                  {t.apartment_name}
                </p>
                <p className="text-[10px] text-[var(--color-text-sub)]">
                  {t.area}㎡ · {t.floor}층 · {t.deal_date}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-[var(--color-primary)]">
                {formatKrwMan(t.deal_amount)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {!loading && !apiError && totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-border)]
                       text-xs text-[var(--color-text-sub)] hover:border-[var(--color-primary)]
                       hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30
                       transition-colors"
            aria-label="이전 페이지"
          >
            ‹
          </button>
          <span className="text-[11px] text-[var(--color-text-sub)]">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
            className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-border)]
                       text-xs text-[var(--color-text-sub)] hover:border-[var(--color-primary)]
                       hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-30
                       transition-colors"
            aria-label="다음 페이지"
          >
            ›
          </button>
        </div>
      )}

      <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">
        출처: 국토교통부 실거래가 자료 (참고용) · 교육·참고 목적이며 투자 권유가 아닙니다.
      </p>
    </Card>
  );
}
