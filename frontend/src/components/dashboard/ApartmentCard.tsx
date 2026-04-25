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

  useEffect(() => {
    if (!lawdCd) {
      setLoading(false);
      return;
    }

    fetch(`/api/public-data/apartments?lawd_cd=${lawdCd}&deal_ymd=${dealYmd}`)
      .then((r) => r.json())
      .then((json) => setTransactions((json?.data ?? []).slice(0, 5)))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [lawdCd, dealYmd]);

  if (!lawdCd || (!loading && transactions.length === 0)) return null;

  const year = dealYmd.slice(0, 4);
  const month = dealYmd.slice(4);

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
