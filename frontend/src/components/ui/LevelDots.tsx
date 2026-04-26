// frontend/src/components/ui/LevelDots.tsx
function toLevel(value: number): 1 | 2 | 3 | 4 | 5 {
  if (value >= 85) return 5;
  if (value >= 70) return 4;
  if (value >= 50) return 3;
  if (value >= 30) return 2;
  return 1;
}

interface LevelDotsProps {
  value: number;  // 0~100 점수 → 1~5 레벨로 변환
  className?: string;
}

export default function LevelDots({ value, className = "" }: LevelDotsProps) {
  const level = toLevel(value);
  return (
    <div className={`mt-3 flex gap-1.5 ${className}`}>
      {([1, 2, 3, 4, 5] as const).map((dot) => (
        <span
          key={dot}
          className={`h-2 flex-1 rounded-full ${
            dot <= level
              ? "bg-gradient-to-r from-[#2563EB] to-[#00C2A8]"
              : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  );
}

export { toLevel };
