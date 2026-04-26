// frontend/src/components/dashboard/TodayActions.tsx
"use client";

import { useState } from "react";
import type { TodayAction } from "@/lib/types";

interface Props {
  actions: TodayAction[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
}

const CATEGORY_STYLES: Record<string, string> = {
  financial: "bg-blue-50 text-blue-600",
  housing: "bg-amber-50 text-amber-600",
  learning: "bg-purple-50 text-purple-600",
  routine: "bg-[var(--color-point-light)] text-[var(--color-point)]",
  general: "bg-[var(--color-bg)] text-[var(--color-text-sub)]",
};

const CATEGORY_LABEL: Record<string, string> = {
  financial: "금융",
  housing: "주거",
  learning: "학습",
  routine: "루틴",
  general: "일반",
};

export default function TodayActions({ actions, onToggle }: Props) {
  const [states, setStates] = useState<Record<number, boolean>>(
    Object.fromEntries(actions.map((a) => [a.id, a.completed])),
  );

  async function handleToggle(id: number) {
    const next = !states[id];
    setStates((prev) => ({ ...prev, [id]: next }));
    try {
      await onToggle(id, next);
    } catch {
      setStates((prev) => ({ ...prev, [id]: !next }));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-[var(--color-text-sub)]">오늘 할 행동</p>
      {actions.length === 0 && (
        <p className="text-sm text-[var(--color-text-sub)]">오늘의 행동이 없습니다.</p>
      )}
      {actions.map((action, index) => {
        const done = states[action.id] ?? action.completed;
        return (
          <button
            key={action.id}
            onClick={() => handleToggle(action.id)}
            className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-bg)]"
          >
            {/* 번호 원형 — 완료 시 체크로 변환 */}
            <span
              className={[
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                done
                  ? "bg-[var(--color-point)] text-white"
                  : "border-2 border-[var(--color-border)] text-[var(--color-text-sub)]",
              ].join(" ")}
            >
              {done ? "✓" : index + 1}
            </span>

            {/* 행동 텍스트 + 카테고리 태그 */}
            <div className="flex flex-1 flex-col gap-0.5">
              <span
                className={
                  done
                    ? "text-sm line-through text-[var(--color-text-sub)]"
                    : "text-sm text-[var(--color-text)]"
                }
              >
                {action.text}
              </span>
              <span
                className={`self-start rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  CATEGORY_STYLES[action.category] ?? CATEGORY_STYLES.general
                }`}
              >
                {CATEGORY_LABEL[action.category] ?? action.category}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
