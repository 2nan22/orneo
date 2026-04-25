// frontend/src/components/reports/NextActionCard.tsx

interface Props {
  action: string;
}

export default function NextActionCard({ action }: Props) {
  return (
    <div className="rounded-xl border border-[#00C2A8]/30 bg-[#00C2A8]/5 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#00C2A8]">
        다음 주 핵심 행동
      </p>
      <p className="text-sm font-medium text-[var(--color-text)]">"{action}"</p>
    </div>
  );
}
