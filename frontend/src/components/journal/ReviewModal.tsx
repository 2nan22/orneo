// frontend/src/components/journal/ReviewModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import DecisionStudio from "./DecisionStudio";
import type { DecisionScenarioData, JournalEntry } from "@/lib/types";

const CATEGORY_LABEL: Record<string, string> = {
  investment: "투자",
  housing: "주거",
  learning: "학습",
  routine: "루틴",
};

interface Props {
  entry: JournalEntry;
  onClose: () => void;
  onSave: (memo: string) => Promise<void>;
}

export default function ReviewModal({ entry, onClose, onSave }: Props) {
  const [memo,     setMemo]     = useState(entry.review_memo ?? "");
  const [saving,   setSaving]   = useState(false);
  const [scenario, setScenario] = useState<DecisionScenarioData | null | undefined>(
    entry.decision_scenario,
  );
  const [generating, setGenerating]     = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC 키 닫기
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(memo);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateScenario() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/journals/${entry.id}/scenarios/`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setScenario(json.data);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerateScenario() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/v1/journals/${entry.id}/scenarios/regenerate/`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setScenario(json.data);
      }
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--color-card)] shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="font-semibold text-[var(--color-text)]">복기 작성</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-text-sub)] hover:bg-[var(--color-bg)]"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* 일지 원문 */}
        <div className="px-6 pt-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-sub)]">
              {CATEGORY_LABEL[entry.category]}
            </span>
            <span className="text-xs text-[var(--color-text-sub)]">/</span>
            <span className="text-xs text-[var(--color-text-sub)]">
              {new Date(entry.created_at).toLocaleDateString("ko-KR")}
            </span>
          </div>
          <p className="font-semibold text-[var(--color-text)]">{entry.title}</p>
          <p className="mt-1 line-clamp-3 text-sm text-[var(--color-text-sub)]">{entry.content}</p>
        </div>

        {/* AI 요약 */}
        {entry.ai_summary && (
          <div className="mx-6 mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
            <p className="mb-1 text-xs font-semibold text-[var(--color-point)]">AI 요약</p>
            <p className="text-sm text-[var(--color-text-sub)]">{entry.ai_summary}</p>
          </div>
        )}

        {/* DecisionStudio — investment·housing 카테고리만 표시 */}
        {(entry.category === "investment" || entry.category === "housing") && (
          <div className="mx-6 mt-3">
            {scenario ? (
              <DecisionStudio
                topic={scenario.topic}
                evidenceChips={scenario.evidence_chips}
                scenarios={scenario.scenarios}
                disclaimer={scenario.disclaimer}
                onRegenerate={handleRegenerateScenario}
                isRegenerating={regenerating}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-5 text-center">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-point)]">
                  Decision Studio
                </p>
                <p className="mb-3 text-xs text-[var(--color-text-sub)]">
                  이 일지에 대한 AI 시나리오가 아직 없습니다.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateScenario}
                  disabled={generating}
                  className="rounded-lg border border-[var(--color-primary)] px-4 py-1.5
                             text-xs font-medium text-[var(--color-primary)]
                             hover:bg-[var(--color-primary)] hover:text-white
                             disabled:cursor-not-allowed disabled:opacity-50
                             transition-colors"
                >
                  {generating ? "생성 중..." : "시나리오 생성하기"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 복기 메모 */}
        <div className="px-6 pt-4">
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
            복기 메모
          </label>
          <textarea
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-sub)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            rows={4}
            placeholder="이 결정을 돌아보며 배운 점, 달라진 생각을 기록하세요."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!memo.trim()}>
            복기 저장
          </Button>
        </div>
      </div>
    </div>
  );
}
