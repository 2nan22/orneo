// frontend/src/components/goals/CourseSuggestionCard.tsx
"use client";

import { useEffect, useState } from "react";

interface Course {
  course_id: string;
  course_name: string;
  org_name: string;
  short_description: string;
}

export default function CourseSuggestionCard({ keyword }: { keyword: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !keyword) return;
    setLoading(true);
    fetch(`/api/public-data/kmooc?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => setCourses((json?.data ?? []).slice(0, 3)))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [open, keyword]);

  return (
    <div className="mt-2 border-t border-[var(--color-border)] pt-2">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between text-xs font-medium
                   text-[var(--color-point)] hover:opacity-80"
      >
        관련 K-MOOC 강좌 보기
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {loading ? (
            <p className="text-xs text-[var(--color-text-sub)]">검색 중...</p>
          ) : courses.length === 0 ? (
            <p className="text-xs text-[var(--color-text-sub)]">해당 강좌를 찾을 수 없습니다.</p>
          ) : (
            courses.map((c) => (
              <a
                key={c.course_id}
                href={`https://www.kmooc.kr/courses/${c.course_id}/about`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-[var(--color-border)]
                           px-3 py-2 hover:border-[var(--color-primary)] transition-colors"
              >
                <p className="text-xs font-medium text-[var(--color-text)]">{c.course_name}</p>
                <p className="text-[10px] text-[var(--color-text-sub)]">{c.org_name}</p>
                {c.short_description && (
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-[var(--color-text-sub)]">
                    {c.short_description}
                  </p>
                )}
              </a>
            ))
          )}
          <p className="text-[10px] text-[var(--color-text-sub)]">
            출처: K-MOOC 한국형 온라인 공개강좌 (참고용)
          </p>
        </div>
      )}
    </div>
  );
}
