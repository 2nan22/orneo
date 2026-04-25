// frontend/src/components/dashboard/KeyQuestion.tsx
import Card from "@/components/ui/Card";

interface Props {
  question: string;
}

export default function KeyQuestion({ question }: Props) {
  return (
    <Card variant="point" padding="md">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-point)]">
        오늘의 핵심 질문
      </p>
      <p className="text-base font-semibold text-[var(--color-text)]">&ldquo;{question}&rdquo;</p>
    </Card>
  );
}
