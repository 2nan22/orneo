// frontend/src/components/goals/GoalCreateModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { api } from "@/lib/api";
import type { Goal, GoalCategory } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";

const CATEGORY_OPTIONS: { value: GoalCategory; label: string; icon: string }[] = [
  { value: "finance", label: "금융", icon: "💰" },
  { value: "housing", label: "주거", icon: "🏠" },
  { value: "learning", label: "학습", icon: "📚" },
  { value: "routine", label: "루틴", icon: "⚡" },
];

interface Props {
  onClose: () => void;
  onCreated: (goal: Goal) => void;
}

export default function GoalCreateModal({ onClose, onCreated }: Props) {
  const [category, setCategory] = useState<GoalCategory>("finance");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setToast("제목을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        category,
        title: title.trim(),
      };
      if (description.trim()) body.description = description.trim();
      if (targetDate) body.target_date = targetDate;
      if (category === "finance" && targetAmount)
        body.target_amount = Number(targetAmount);

      const goal = await api.post<Goal>("/goals/", body);
      onCreated(goal);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "목표 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      >
        <div
          ref={dialogRef}
          className="w-full max-w-md rounded-2xl bg-[var(--color-card)] p-6 shadow-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-modal-title"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="goal-modal-title" className="text-lg font-bold text-[var(--color-text)]">목표 추가</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]"
              aria-label="닫기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Category */}
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--color-text)]">카테고리</p>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={[
                      "flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-all",
                      category === opt.value
                        ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[var(--color-primary)]",
                    ].join(" ")}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <Input
              id="goal-title"
              label="제목"
              placeholder="예: 비상금 1천만 원 달성"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="goal-desc"
                className="text-sm font-medium text-[var(--color-text)]"
              >
                설명 <span className="font-normal text-[var(--color-text-sub)]">(선택)</span>
              </label>
              <textarea
                id="goal-desc"
                rows={2}
                placeholder="목표에 대한 상세 내용을 입력하세요."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-sub)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Target date */}
            <Input
              id="goal-date"
              type="date"
              label="목표 날짜 (선택)"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />

            {/* Target amount — finance only */}
            {category === "finance" && (
              <div className="relative">
                <Input
                  id="goal-amount"
                  type="number"
                  label="목표 금액 (선택)"
                  placeholder="10000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pr-10"
                />
                <span className="absolute bottom-3 right-4 text-sm text-[var(--color-text-sub)]">
                  원
                </span>
              </div>
            )}

            <Button type="submit" loading={loading} className="mt-2 w-full">
              저장
            </Button>
          </form>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast("")} />}
    </>
  );
}
