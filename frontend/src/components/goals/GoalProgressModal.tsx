// frontend/src/components/goals/GoalProgressModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { Goal } from "@/lib/types";

const QUICK_OPTIONS = [
  { label: "10%",  value: 0.1  },
  { label: "25%",  value: 0.25 },
  { label: "50%",  value: 0.5  },
  { label: "75%",  value: 0.75 },
  { label: "완료", value: 1.0  },
];

interface Props {
  goal: Goal;
  onClose: () => void;
  onUpdated: (updated: Goal) => void;
}

export default function GoalProgressModal({ goal, onClose, onUpdated }: Props) {
  const [progress, setProgress]   = useState(Math.round(goal.progress * 100));
  const [saving, setSaving]       = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.patch<Goal>(`/goals/${goal.id}/`, {
        progress: progress / 100,
      });
      onUpdated(updated);
      onClose();
    } catch {
      setToast("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      const updated = await api.patch<Goal>(`/goals/${goal.id}/`, {
        is_active: false,
      });
      onUpdated(updated);
      onClose();
    } catch {
      setToast("보관 처리에 실패했습니다.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-0"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <div
          ref={dialogRef}
          className="w-full max-w-md rounded-t-[var(--radius-3xl)] bg-[var(--color-card)] px-6 pt-6 pb-8 shadow-[var(--shadow-modal)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="progress-modal-title"
        >
          {/* 드래그 핸들 */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[var(--color-border)]" />

          {/* 헤더 */}
          <div className="mb-5">
            <p className="text-xs font-black tracking-[0.2em] text-[#2563EB]">GOAL UPDATE</p>
            <h2 id="progress-modal-title" className="mt-1 text-lg font-black leading-snug text-[#0B132B]">
              {goal.title}
            </h2>
          </div>

          {/* 현재 진척도 큰 표시 */}
          <div className="mb-5 text-center">
            <span className="text-6xl font-black tracking-[-0.07em] text-[#2563EB]">
              {progress}
            </span>
            <span className="text-2xl font-black text-[#2563EB]">%</span>
          </div>

          {/* 슬라이더 */}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="mb-4 w-full accent-[#2563EB]"
            aria-label="진척도 슬라이더"
          />

          {/* 빠른 선택 버튼 */}
          <div className="mb-6 flex gap-2">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setProgress(Math.round(opt.value * 100))}
                className={[
                  "flex-1 rounded-[var(--radius-lg)] border py-2 text-xs font-black transition-all",
                  progress === Math.round(opt.value * 100)
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[#2563EB]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* 저장 버튼 */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            loading={saving}
            className="mb-3"
          >
            저장
          </Button>

          {/* 목표 보관 버튼 */}
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={handleArchive}
            loading={archiving}
          >
            목표 보관 (비활성화)
          </Button>
        </div>
      </div>

      {toast && (
        <Toast
          type="error"
          message={toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
