// frontend/src/components/journal/DartCorpSearchInput.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export interface Corp {
  corp_code: string;
  corp_name: string;
}

interface Props {
  value: Corp | null;
  onChange: (corp: Corp | null) => void;
}

export default function DartCorpSearchInput({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.corp_name ?? "");
  const [results, setResults] = useState<Corp[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // query 변경 시 검색
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    // 이미 선택된 값과 동일하면 재검색 생략
    if (value?.corp_name === query) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/public-data/dart/corps?keyword=${encodeURIComponent(query)}`,
        );
        const json = await res.json();
        setResults(json?.data ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, value?.corp_name]);

  function handleSelect(corp: Corp) {
    setQuery(corp.corp_name);
    setResults([]);
    setOpen(false);
    onChange(corp);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    onChange(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="종목명 입력 (예: 삼성전자)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null); // 타이핑 시 선택 초기화
          }}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 pr-10
                     text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-sub)]
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sub)]
                       hover:text-[var(--color-text)] transition-colors"
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 선택된 종목 표시 */}
      {value && (
        <p className="mt-1 text-xs text-[var(--color-point)] font-medium">
          ✓ {value.corp_name} 선택됨
        </p>
      )}

      {/* 드롭다운 */}
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-xl border border-[var(--color-border)]
                       bg-white shadow-md overflow-hidden">
          {results.map((corp) => (
            <li key={corp.corp_code}>
              <button
                type="button"
                onClick={() => handleSelect(corp)}
                className="w-full px-4 py-3 text-left text-sm hover:bg-[var(--color-bg)]
                           text-[var(--color-text)] transition-colors"
              >
                <span className="font-medium">{corp.corp_name}</span>
                <span className="ml-2 text-xs text-[var(--color-text-sub)]">
                  {corp.corp_code}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 로딩 / 결과 없음 */}
      {open && !loading && results.length === 0 && query.length >= 2 && !value && (
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">검색 결과가 없습니다.</p>
      )}
      {loading && (
        <p className="mt-1 text-xs text-[var(--color-text-sub)]">검색 중...</p>
      )}
    </div>
  );
}
