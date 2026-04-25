// frontend/src/components/journal/DartDisclosureBadge.tsx
"use client";

import { useEffect, useState } from "react";

interface Disclosure {
  corp_name: string;
  report_name: string;
  receipt_date: string;
}

// 제목에서 종목명 추출 (2~6자 한글/영문 + 업종 접미어)
function extractCorpName(title: string): string {
  const match = title.match(
    /([가-힣A-Za-z]{2,6}(?:전자|증권|화학|에너지|바이오|건설|금융|통신|보험|카드|캐피탈)?)/,
  );
  return match?.[1] ?? "";
}

export default function DartDisclosureBadge({ title }: { title: string }) {
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const corpName = extractCorpName(title);

  useEffect(() => {
    if (!corpName) return;
    fetch(`/api/public-data/dart?corp_name=${encodeURIComponent(corpName)}`)
      .then((r) => r.json())
      .then((json) => {
        const first = (json?.data ?? [])[0] ?? null;
        setDisclosure(first);
      })
      .catch(() => setDisclosure(null));
  }, [corpName]);

  if (!disclosure) return null;

  return (
    <div
      className="mt-1 inline-flex items-center gap-1 rounded-full
                 bg-blue-50 px-2 py-0.5"
      title="이 데이터는 참고용이며 투자 권유가 아닙니다."
    >
      <span className="text-[10px] font-medium text-[var(--color-primary)]">
        {disclosure.corp_name} 최근 공시 ›
      </span>
    </div>
  );
}
