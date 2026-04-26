// frontend/src/app/(onboarding)/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  monthly_savings_goal: number;
  asset_range: string;
  housing_status: string;
  desired_region: string;
  risk_tolerance: string;
  learning_interests: string[];
};

const TOTAL_STEPS = 5;

const ASSET_RANGES = [
  { value: "under_50m", label: "5천만 원 미만" },
  { value: "50m_to_200m", label: "5천만 ~ 2억 원" },
  { value: "over_200m", label: "2억 원 이상" },
];

const HOUSING_OPTIONS = [
  { value: "jeonse", label: "전세", emoji: "🏠" },
  { value: "monthly_rent", label: "월세", emoji: "🏢" },
  { value: "owned", label: "자가", emoji: "🏡" },
];

const RISK_OPTIONS = [
  {
    value: "conservative",
    label: "안정형",
    desc: "원금 보존을 최우선으로 합니다. 낮은 수익률이라도 안전한 운용을 선호합니다.",
    emoji: "🛡️",
  },
  {
    value: "moderate",
    label: "중립형",
    desc: "적정 수익과 적정 리스크의 균형을 추구합니다.",
    emoji: "⚖️",
  },
  {
    value: "aggressive",
    label: "공격형",
    desc: "높은 수익을 목표로 상당한 리스크를 감수합니다.",
    emoji: "🚀",
  },
];

const INTEREST_TAGS = ["IT", "금융", "부동산", "자기계발", "언어", "창업", "건강", "예술"];

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Input
          id="monthly_savings"
          label="월 저축 목표액"
          type="number"
          placeholder="300000"
          suffix={<span>원</span>}
          value={data.monthly_savings_goal || ""}
          onChange={(e) => onChange({ monthly_savings_goal: Number(e.target.value) })}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-[var(--color-text)]">총 자산 범위</p>
        <div className="flex flex-col gap-2">
          {ASSET_RANGES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ asset_range: opt.value })}
              className={[
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                data.asset_range === opt.value
                  ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm font-medium text-[var(--color-text)]">현재 주거 상태</p>
        <div className="grid grid-cols-3 gap-3">
          {HOUSING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ housing_status: opt.value })}
              className={[
                "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-sm font-medium transition-all",
                data.housing_status === opt.value
                  ? "border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]",
              ].join(" ")}
            >
              <span className="text-2xl">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        id="desired_region"
        label="희망 지역 (선택)"
        placeholder="예: 서울 마포구, 성남 분당구"
        value={data.desired_region}
        onChange={(e) => onChange({ desired_region: e.target.value })}
      />
    </div>
  );
}

function Step3({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {RISK_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange({ risk_tolerance: opt.value })}
          className={[
            "flex items-start gap-4 rounded-xl border px-4 py-4 text-left transition-all",
            data.risk_tolerance === opt.value
              ? "border-[var(--color-primary)] bg-blue-50"
              : "border-[var(--color-border)] hover:border-[var(--color-primary)]",
          ].join(" ")}
        >
          <span className="text-2xl">{opt.emoji}</span>
          <div>
            <p
              className={[
                "mb-1 font-semibold text-sm",
                data.risk_tolerance === opt.value
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text)]",
              ].join(" ")}
            >
              {opt.label}
            </p>
            <p className="text-xs text-[var(--color-text-sub)]">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function Step4({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}) {
  function toggle(tag: string) {
    const current = data.learning_interests;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onChange({ learning_interests: next });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--color-text-sub)]">관심 있는 분야를 모두 선택하세요.</p>
      <div className="flex flex-wrap gap-2">
        {INTEREST_TAGS.map((tag) => {
          const selected = data.learning_interests.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                selected
                  ? "border-[var(--color-point)] bg-[var(--color-point)] text-white"
                  : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-point)]",
              ].join(" ")}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step5({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)]">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h3 className="mb-2 text-xl font-bold text-[var(--color-text)]">설정이 완료되었습니다!</h3>
      <p className="mb-8 text-sm text-[var(--color-text-sub)]">
        오늘의 선택으로, 더 나은 나를.
      </p>
      <Button onClick={onStart} className="w-full max-w-xs">
        시작하기
      </Button>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const percent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-sub)]">
          {step}/{TOTAL_STEPS}단계
        </span>
        <span className="text-xs text-[var(--color-text-sub)]">{Math.round(percent)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-point)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step titles ──────────────────────────────────────────────────────────────

const STEP_TITLES: Record<number, { title: string; desc: string }> = {
  1: { title: "재무 정보", desc: "현재 재정 상황을 알려주세요." },
  2: { title: "주거 상태", desc: "지금 어디에 살고 계신가요?" },
  3: { title: "투자 성향", desc: "어떤 방식으로 자산을 운용하고 싶으신가요?" },
  4: { title: "학습 관심사", desc: "관심 있는 분야를 선택해주세요." },
  5: { title: "준비 완료!", desc: "" },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  monthly_savings_goal: 0,
  asset_range: "",
  housing_status: "",
  desired_region: "",
  risk_tolerance: "",
  learning_interests: [],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function patch(partial: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function handleComplete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok && data?.code !== "ALREADY_ONBOARDED") {
        setError(data?.message ?? "온보딩 저장에 실패했습니다.");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const { title, desc } = STEP_TITLES[step];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="mb-6 text-center">
          <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] bg-clip-text text-2xl font-bold text-transparent">
            ORNEO
          </span>
        </div>

        <Card>
          <ProgressBar step={step} />

          <h2 className="mb-1 text-lg font-bold text-[var(--color-text)]">{title}</h2>
          {desc && <p className="mb-6 text-sm text-[var(--color-text-sub)]">{desc}</p>}

          {/* Step content */}
          {step === 1 && <Step1 data={form} onChange={patch} />}
          {step === 2 && <Step2 data={form} onChange={patch} />}
          {step === 3 && <Step3 data={form} onChange={patch} />}
          {step === 4 && <Step4 data={form} onChange={patch} />}
          {step === 5 && <Step5 onStart={handleComplete} />}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Navigation buttons (steps 1~4) */}
          {step < 5 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 1}
                className="text-sm text-[var(--color-text-sub)] disabled:invisible hover:text-[var(--color-text)]"
              >
                ← 이전
              </button>
              <Button
                onClick={() => setStep((s) => s + 1)}
                loading={loading}
                className="px-8"
              >
                다음
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
