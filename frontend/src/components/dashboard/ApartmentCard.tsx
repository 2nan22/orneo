// frontend/src/components/dashboard/ApartmentCard.tsx
"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";

interface Transaction {
  deal_amount: number;
  area: number;
  floor: number;
  deal_date: string;
  apartment_name: string;
  legal_dong: string;
}

interface Props {
  lawdCd: string;
  dealYmd: string;
  regionName: string;
}

export default function ApartmentCard({ lawdCd, dealYmd, regionName }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedYmd, setFetchedYmd] = useState(dealYmd);

  useEffect(() => {
    if (!lawdCd) {
      setLoading(false);
      return;
    }

    // 당월 조회 → 0건이면 전월로 자동 fallback
    async function fetchTransactions(ymd: string): Promise<{ data: Transaction[] }> {
      const res = await fetch(`/api/public-data/apartments?lawd_cd=${lawdCd}&deal_ymd=${ymd}`);
      return res.json();
    }

    async function load() {
      try {
        const json = await fetchTransactions(dealYmd);
        const items: Transaction[] = (json?.data ?? []).slice(0, 5);

        if (items.length === 0) {
          // 전월 계산: YYYYMM → Date 객체
          const year = parseInt(dealYmd.slice(0, 4), 10);
          const month = parseInt(dealYmd.slice(4), 10); // 1-indexed
          const prevDate = new Date(year, month - 2, 1); // month-2: JS month is 0-indexed, we subtract 1 more
          const prevYmd =
            String(prevDate.getFullYear()) +
            String(prevDate.getMonth() + 1).padStart(2, "0");

          const prevJson = await fetchTransactions(prevYmd);
          const prevItems: Transaction[] = (prevJson?.data ?? []).slice(0, 5);
          setTransactions(prevItems);
          setFetchedYmd(prevYmd);
        } else {
          setTransactions(items);
          setFetchedYmd(dealYmd);
        }
      } catch {
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [lawdCd, dealYmd]);

  // lawdCd 없으면 렌더하지 않음
  if (!lawdCd) return null;

  const year = fetchedYmd.slice(0, 4);
  const month = fetchedYmd.slice(4);

  return (
    <Card padding="md">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-text)]">
          {regionName} 실거래가
        </p>
        <span className="text-[10px] text-[var(--color-text-sub)]">
          {year}년 {month}월
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-4 text-center text-xs text-[var(--color-text-sub)]">
          해당 지역 최근 거래 내역이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {transactions.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium text-[var(--color-text)]">
                  {t.apartment_name}
                </p>
                <p className="text-[10px] text-[var(--color-text-sub)]">
                  {t.area}㎡ · {t.floor}층 · {t.deal_date}
                </p>
              </div>
              <p className="text-sm font-bold text-[var(--color-primary)]">
                {t.deal_amount.toLocaleString("ko-KR")}만
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[var(--color-text-sub)]">
        출처: 국토교통부 실거래가 자료 (참고용) · 이 데이터는 교육·참고 목적이며
        투자 권유가 아닙니다.
      </p>
    </Card>
  );
}
