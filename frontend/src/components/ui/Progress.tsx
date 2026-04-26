// frontend/src/components/ui/Progress.tsx
type ProgressTone = "blue" | "green" | "red";

interface ProgressProps {
  value: number;  // 0~100
  tone?: ProgressTone;
  className?: string;
}

const barStyles: Record<ProgressTone, string> = {
  blue:  "from-[#2563EB] to-[#00C2A8]",
  green: "from-[#00C2A8] to-[#2563EB]",
  red:   "from-rose-500 to-amber-500",
};

export default function Progress({ value, tone = "blue", className = "" }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${barStyles[tone]}`}
        style={{ width: `${clamped}%`, transition: "width 0.4s ease" }}
      />
    </div>
  );
}
