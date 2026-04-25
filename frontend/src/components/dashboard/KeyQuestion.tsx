// frontend/src/components/dashboard/KeyQuestion.tsx

interface Props {
  question: string;
}

export default function KeyQuestion({ question }: Props) {
  return (
    <div className="rounded-2xl border-l-4 border-[var(--color-point)] bg-[var(--color-card)] px-5 py-4 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-point)]">
        오늘의 핵심 질문
      </p>
      <p className="text-base font-semibold text-[var(--color-text)]">&ldquo;{question}&rdquo;</p>
    </div>
  );
}
