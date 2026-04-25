// frontend/src/components/dashboard/TodayActions.tsx
"use client";

import { useState } from "react";
import type { TodayAction } from "@/lib/types";

interface Props {
  actions: TodayAction[];
  onToggle: (id: number, completed: boolean) => Promise<void>;
}

export default function TodayActions({ actions, onToggle }: Props) {
  const [states, setStates] = useState<Record<number, boolean>>(
    Object.fromEntries(actions.map((a) => [a.id, a.completed])),
  );

  async function handleToggle(id: number) {
    const next = !states[id];
    // 낙관적 업데이트
    setStates((prev) => ({ ...prev, [id]: next }));
    try {
      await onToggle(id, next);
    } catch {
      // 실패 시 롤백
      setStates((prev) => ({ ...prev, [id]: !next }));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-[var(--color-text-sub)]">오늘 할 행동</p>
      {actions.length === 0 && (
        <p className="text-sm text-[var(--color-text-sub)]">오늘의 행동이 없습니다.</p>
      )}
      {actions.map((action) => {
        const done = states[action.id] ?? action.completed;
        return (
          <button
            key={action.id}
            onClick={() => handleToggle(action.id)}
            className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-bg)]"
          >
            {/* 체크 아이콘 */}
            <span
              className={[
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                done
                  ? "border-[var(--color-point)] bg-[var(--color-point)]"
                  : "border-[var(--color-border)]",
              ].join(" ")}
            >
              {done && (
                <svg
                  width="10"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={[
                "text-sm leading-snug transition-all",
                done
                  ? "text-[var(--color-text-sub)] line-through"
                  : "text-[var(--color-text)]",
              ].join(" ")}
            >
              {action.text}
            </span>
          </button>
        );
      })}
    </div>
  );
}
