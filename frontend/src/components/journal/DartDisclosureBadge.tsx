// frontend/src/components/journal/DartDisclosureBadge.tsx
"use client";

import { useEffect, useState } from "react";

interface Disclosure {
  corp_name: string;
  report_name: string;
  receipt_date: string;
  url: string;
}

interface Props {
  title: string;
  category: string;
}

// 제목에서 종목명 추출 (2~8자 한글/영문 + 업종 접미어)
function extractCorpName(title: string): string {
  const match = title.match(
    /([가-힣A-Za-z]{2,8}(?:전자|증권|화학|에너지|바이오|건설|금융|통신|보험|카드|캐피탈|물산|제약|홀딩스|그룹|산업|자동차|항공|모빌리티)?)/,
  );
  return match?.[1] ?? "";
}

export default function DartDisclosureBadge({ title, category }: Props) {
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const corpName = extractCorpName(title);

  useEffect(() => {
    if (category !== "investment" || !corpName) return;
    fetch(`/api/public-data/dart?corp_name=${encodeURIComponent(corpName)}`)
      .then((r) => r.json())
      .then((json) => {
        const first = (json?.data ?? [])[0] ?? null;
        setDisclosure(first);
      })
      .catch(() => setDisclosure(null));
  }, [corpName, category]);

  if (!disclosure) return null;

  return (
    <a
      href={disclosure.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-1 inline-flex items-center gap-1 rounded-full
                 bg-blue-50 px-2 py-0.5 hover:bg-blue-100 transition-colors"
      title="이 데이터는 참고용이며 투자 권유가 아닙니다."
    >
      <span className="text-[10px] font-medium text-[var(--color-primary)]">
        {disclosure.corp_name} 최근 공시 →
      </span>
    </a>
  );
}
