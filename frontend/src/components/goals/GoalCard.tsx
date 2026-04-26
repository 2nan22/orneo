// frontend/src/components/goals/GoalCard.tsx
"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import CourseSuggestionCard from "./CourseSuggestionCard";
import GoalProgressModal from "./GoalProgressModal";
import type { Goal, GoalCategory } from "@/lib/types";

const CATEGORY_META: Record<GoalCategory, { label: string; icon: string; color: string }> = {
  finance:  { label: "금융", icon: "💰", color: "bg-[var(--color-primary-light)] text-[var(--color-primary)]"  },
  housing:  { label: "주거", icon: "🏠", color: "bg-[var(--color-point-light)] text-[#008C7A]"                 },
  learning: { label: "학습", icon: "📚", color: "bg-violet-50 text-violet-700"                                 },
  routine:  { label: "루틴", icon: "⚡", color: "bg-amber-50 text-amber-700"                                   },
};

interface GoalCardProps {
  goal: Goal;
  onProgressUpdate?: (updated: Goal) => void;
}

const KMOOC_STOPWORDS = [
  "과정", "수료", "달성", "준비", "목표", "계획", "공부", "학습", "완료", "하기",
  "K-MOOC", "MOOC", "강좌", "온라인", "이수",
];

function extractKeyword(title: string): string {
  const words = title.split(/[\s·,]+/);
  const keywords = words.filter(
    (w) => w.length >= 2 && !KMOOC_STOPWORDS.includes(w),
  );
  return keywords.slice(0, 2).join(" ") || title;
}

export default function GoalCard({ goal, onProgressUpdate }: GoalCardProps) {
  const [showModal, setShowModal] = useState(false);

  const meta = CATEGORY_META[goal.category] ?? {
    label: goal.category,
    icon: "🎯",
    color: "bg-gray-100 text-gray-700",
  };

  const isOverdue =
    goal.target_date != null &&
    goal.progress < 1 &&
    new Date(goal.target_date) < new Date();

  const progressPct = Math.min(Math.round(goal.progress * 100), 100);

  return (
    <Card as="article" padding="lg" className="transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          {isOverdue && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
              기한 초과
            </span>
          )}
        </div>
        {goal.target_date && (
          <span className="shrink-0 text-xs text-[var(--color-text-sub)]">
            {new Date(goal.target_date).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      <h3 className="mb-3 font-semibold text-[var(--color-text)]">{goal.title}</h3>

      {/* Progress bar — 클릭하면 모달 오픈 */}
      <div
        className="group flex cursor-pointer items-center gap-3"
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        aria-label={`진척도 수정 — 현재 ${progressPct}%`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setShowModal(true); }}
      >
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, backgroundColor: "var(--color-point)" }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-10 shrink-0 text-right text-sm font-semibold text-[var(--color-text)]">
            {progressPct}%
          </span>
          {/* 편집 아이콘 — 호버 시 표시 */}
          <span className="opacity-0 transition-opacity group-hover:opacity-100 text-[var(--color-text-sub)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
        </div>
      </div>

      {goal.category === "learning" && (
        <CourseSuggestionCard keyword={extractKeyword(goal.title)} />
      )}

      {showModal && (
        <GoalProgressModal
          goal={goal}
          onClose={() => setShowModal(false)}
          onUpdated={(updated) => {
            setShowModal(false);
            onProgressUpdate?.(updated);
          }}
        />
      )}
    </Card>
  );
}
