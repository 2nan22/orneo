// frontend/src/app/(app)/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/ui/PageContainer";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { REGION_GROUPS, REGION_LIST, REGION_MAP, type RegionOption } from "@/lib/regionList";

type Profile = {
  username: string;
  email: string;
  risk_tolerance: string;
  preferred_region: string;
  preferred_region_code: string;
  learning_interests: string[];
};

const RISK_OPTIONS = [
  { value: "conservative", label: "안정형 🛡️" },
  { value: "moderate",     label: "중립형 ⚖️" },
  { value: "aggressive",   label: "공격형 🚀" },
];

const INTEREST_TAGS = ["IT", "금융", "부동산", "자기계발", "언어", "창업", "건강", "예술"];

const MODEL_OPTIONS = [
  { label: "자동 선택",    desc: "ORNEO AI가 작업에 맞춰 모델을 선택합니다." },
  { label: "Gemma 4 E2B", desc: "온디바이스 요약·마스킹에 적합합니다." },
  { label: "Qwen 2.5",    desc: "로컬 추론·문서 분류에 적합합니다." },
  { label: "서버 고성능",  desc: "심층 리서치와 장문 보고서에 적합합니다." },
];

const DATA_SOURCES = [
  { name: "MOLIT",      label: "부동산 실거래가", value: "연결됨" },
  { name: "DART",       label: "공시·재무 이벤트", value: "연결됨" },
  { name: "K-MOOC",     label: "학습 추천",       value: "연결됨" },
  { name: "Web Search", label: "뉴스·정책 근거",   value: "준비됨" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile]               = useState<Profile | null>(null);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);
  const [modelMode, setModelMode]           = useState("자동 선택");

  const [riskTolerance, setRiskTolerance]           = useState("");
  const [selectedRegion, setSelectedRegion]         = useState<RegionOption | null>(null);
  const [learningInterests, setLearningInterests]   = useState<string[]>([]);

  useEffect(() => {
    api.get<Profile>("/auth/profile")
      .then((p) => {
        setProfile(p);
        setRiskTolerance(p.risk_tolerance);
        setLearningInterests(p.learning_interests);
        const found = REGION_MAP.get(p.preferred_region_code);
        setSelectedRegion(found ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/auth/profile", {
        risk_tolerance:        riskTolerance,
        preferred_region:      selectedRegion?.label ?? "",
        preferred_region_code: selectedRegion?.code  ?? "",
        learning_interests:    learningInterests,
      });
      setToast("프로필이 저장되었습니다.");
    } catch {
      setToast("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function toggleInterest(tag: string) {
    setLearningInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  if (loading) {
    return (
      <PageContainer size="sm">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-8 w-32 rounded bg-[var(--color-border)]" />
          <div className="h-40 rounded-[var(--radius-2xl)] bg-[var(--color-border)]" />
          <div className="h-32 rounded-[var(--radius-2xl)] bg-[var(--color-border)]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="sm">
      {/* 페이지 헤더 */}
      <div className="mb-5">
        <p className="text-xs font-black tracking-[0.22em] text-[#2563EB]">SETTINGS</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#0B132B]">설정</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-[#334155]">
          {"표현 방식과 AI 실행 방식을 관리합니다.\n모델 이름은 설정 화면에서만 노출됩니다."}
        </p>
      </div>

      {/* 계정 정보 (읽기 전용) */}
      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">계정 정보</p>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[var(--color-text-sub)]">{profile?.email}</p>
          <p className="text-xs text-[var(--color-text-sub)]">@{profile?.username}</p>
        </div>
      </Card>

      {/* 프로필 편집 */}
      <Card className="mb-4">
        <p className="mb-4 text-sm font-semibold text-[var(--color-text)]">프로필 설정</p>

        {/* 투자 성향 */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">투자 성향</p>
          <div className="flex gap-2">
            {RISK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRiskTolerance(opt.value)}
                className={[
                  "flex-1 rounded-[var(--radius-lg)] border px-2 py-2 text-xs font-medium transition-all",
                  riskTolerance === opt.value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[var(--color-primary)]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 희망 지역 */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">기본 관심 지역</p>
          <select
            value={selectedRegion?.code ?? ""}
            onChange={(e) => {
              const found = REGION_MAP.get(e.target.value) ?? null;
              setSelectedRegion(found);
            }}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)]
                       bg-white px-4 py-3 text-sm text-[var(--color-text)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">지역 선택 안 함</option>
            {REGION_GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {REGION_LIST.filter((r) => r.group === group).map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[var(--color-text-sub)]">
            대시보드 실거래가 카드의 초기 지역으로 사용됩니다.
          </p>
        </div>

        {/* 학습 관심사 */}
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-[var(--color-text)]">학습 관심사</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleInterest(tag)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  learningInterests.includes(tag)
                    ? "border-[var(--color-point)] bg-[var(--color-point)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-sub)] hover:border-[var(--color-point)]",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" size="md" fullWidth onClick={handleSave} loading={saving}>
          변경 사항 저장
        </Button>
      </Card>

      {/* AI 모델 선택 카드 */}
      <Card className="mb-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-wide text-[#2563EB]">ORNEO AI ENGINE</p>
            <h2 className="text-lg font-black text-[#0B132B]">모델 선택</h2>
          </div>
          <Badge tone="violet">설정 전용</Badge>
        </div>
        <div className="space-y-2">
          {MODEL_OPTIONS.map((model) => (
            <button
              key={model.label}
              onClick={() => setModelMode(model.label)}
              className={[
                "w-full rounded-[var(--radius-2xl)] border p-3 text-left transition-all",
                modelMode === model.label
                  ? "border-[#2563EB] bg-[#2563EB]/5"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#0B132B]">{model.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{model.desc}</p>
                </div>
                {modelMode === model.label && <Badge tone="blue">선택됨</Badge>}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-slate-400">
          모델 선택은 현재 UI 표시 전용입니다. 실제 모델 연동은 추후 업데이트됩니다.
        </p>
      </Card>

      {/* 데이터 연결 카드 */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-lg font-black text-[#0B132B]">데이터 연결</h2>
        <div className="grid gap-2">
          {DATA_SOURCES.map((source) => (
            <div
              key={source.name}
              className="flex items-center justify-between
                         rounded-[var(--radius-2xl)] bg-slate-50 p-3"
            >
              <div>
                <p className="text-sm font-black text-[#0B132B]">{source.name}</p>
                <p className="text-xs text-slate-500">{source.label}</p>
              </div>
              <Badge tone={source.value === "연결됨" ? "green" : "amber"}>
                {source.value}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* 알림 설정 (stub) */}
      <Card variant="outlined" className="mb-4">
        <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">알림 설정</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-text)]">일일 행동 알림</p>
            <p className="text-xs text-[var(--color-text-sub)]">매일 오전 8시 푸시 알림</p>
          </div>
          <div className="flex h-6 w-11 items-center rounded-full bg-[var(--color-border)] px-0.5 opacity-50 cursor-not-allowed">
            <div className="h-5 w-5 rounded-full bg-white shadow" />
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[var(--color-text-sub)]">푸시 알림 기능은 준비 중입니다.</p>
      </Card>

      {/* 온보딩 재설정 */}
      <Card variant="outlined" className="mb-4">
        <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">온보딩 재설정</p>
        <p className="mb-3 text-xs text-[var(--color-text-sub)]">
          재무 정보, 주거 상태 등 초기 설정을 다시 진행합니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/onboarding")}
        >
          온보딩 다시 시작
        </Button>
      </Card>

      {/* 로그아웃 */}
      <Card variant="outlined">
        <Button variant="danger" size="md" fullWidth onClick={handleLogout}>
          로그아웃
        </Button>
      </Card>

      {toast && (
        <Toast
          message={toast}
          type={toast.includes("실패") ? "error" : "success"}
          onDismiss={() => setToast(null)}
        />
      )}
    </PageContainer>
  );
}
