// frontend/src/app/(app)/journal/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import DartCorpSearchInput from "@/components/journal/DartCorpSearchInput";
import type { Corp } from "@/components/journal/DartCorpSearchInput";
import { api } from "@/lib/api";
import type { Goal, JournalCategory } from "@/lib/types";

const CATEGORIES: { value: JournalCategory; label: string; emoji: string }[] = [
  { value: "investment", label: "투자", emoji: "📈" },
  { value: "housing", label: "주거", emoji: "🏠" },
  { value: "learning", label: "학습", emoji: "📚" },
  { value: "routine", label: "루틴", emoji: "🔄" },
];

const MOOD_OPTIONS = [
  { value: 1, emoji: "😔" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😊" },
  { value: 5, emoji: "😄" },
];

export default function NewJournalPage() {
  const router = useRouter();
  const [category, setCategory] = useState<JournalCategory>("investment");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [relatedGoal, setRelatedGoal] = useState<number | null>(null);
  const [selectedCorp, setSelectedCorp] = useState<Corp | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<Goal[]>("/goals").catch(() => []).then(setGoals);
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "제목을 입력하세요.";
    if (!content.trim()) e.content = "내용을 입력하세요.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await api.post("/journals", {
        category,
        title: title.trim(),
        content: content.trim(),
        mood_score: moodScore,
        related_goal: relatedGoal,
        dart_corp_code: selectedCorp?.corp_code ?? "",
        dart_corp_name: selectedCorp?.corp_name ?? "",
      });
      setToast("AI가 요약을 생성 중입니다...");
      // 토스트 보여주고 이동
      setTimeout(() => router.push("/journal"), 1800);
    } catch {
      setErrors({ submit: "저장에 실패했습니다. 다시 시도해주세요." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-1.5 text-[var(--color-text-sub)] hover:bg-[var(--color-card)]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 4l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">새 의사결정 일지</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 카테고리 선택 */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-text)]">카테고리</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={[
                    "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                    category === value
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]",
                  ].join(" ")}
                >
                  <span>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 투자 카테고리 — 종목 선택 */}
          {category === "investment" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                종목 <span className="text-[var(--color-text-sub)]">(선택)</span>
              </label>
              <DartCorpSearchInput value={selectedCorp} onChange={setSelectedCorp} />
            </div>
          )}

          {/* 제목 */}
          <Input
            id="title"
            label="제목"
            placeholder="판단의 핵심을 한 문장으로"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />

          {/* 내용 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]" htmlFor="content">
              내용 <span className="text-[var(--color-text-sub)]">(판단의 이유·근거)</span>
            </label>
            <textarea
              id="content"
              rows={5}
              placeholder="왜 이 결정을 내렸나요? 어떤 정보와 가설을 바탕으로 했나요?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={[
                "w-full rounded-xl border bg-white px-4 py-3 text-sm text-[var(--color-text)]",
                "placeholder:text-[var(--color-text-sub)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
                "transition-all resize-none",
                errors.content
                  ? "border-red-400 focus:ring-red-400"
                  : "border-[var(--color-border)]",
              ].join(" ")}
            />
            {errors.content && (
              <p className="text-xs text-red-500">{errors.content}</p>
            )}
          </div>

          {/* 감정 점수 */}
          <div>
            <p className="mb-2 text-sm font-medium text-[var(--color-text)]">
              감정 점수 <span className="text-[var(--color-text-sub)]">(선택)</span>
            </p>
            <div className="flex gap-2">
              {MOOD_OPTIONS.map(({ value, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMoodScore(moodScore === value ? null : value)}
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition-all",
                    moodScore === value
                      ? "border-[var(--color-primary)] bg-blue-50 scale-110"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]",
                  ].join(" ")}
                  aria-label={`감정 점수 ${value}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 관련 목표 */}
          {goals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-[var(--color-text)]"
                htmlFor="related_goal"
              >
                관련 목표 <span className="text-[var(--color-text-sub)]">(선택)</span>
              </label>
              <select
                id="related_goal"
                value={relatedGoal ?? ""}
                onChange={(e) =>
                  setRelatedGoal(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">목표 없음</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {errors.submit && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {errors.submit}
            </p>
          )}

          <Button type="submit" loading={submitting} className="w-full">
            일지 저장
          </Button>
        </form>
      </Card>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
