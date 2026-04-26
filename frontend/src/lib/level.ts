// frontend/src/lib/level.ts
/**
 * 0~100 점수를 1~5 레벨로 변환하고 레이블/설명을 반환한다.
 */
export type Level = 1 | 2 | 3 | 4 | 5;

export const LEVEL_META: Record<Level, { label: string; copy: string }> = {
  1: { label: "낮음",     copy: "주의가 필요해요" },
  2: { label: "조심",     copy: "속도를 낮춰요" },
  3: { label: "보통",     copy: "균형 상태예요" },
  4: { label: "좋음",     copy: "좋은 흐름이에요" },
  5: { label: "매우 좋음", copy: "강한 흐름이에요" },
};

export function toLevel(value: number): Level {
  if (value >= 85) return 5;
  if (value >= 70) return 4;
  if (value >= 50) return 3;
  if (value >= 30) return 2;
  return 1;
}

export function formatMeasure(
  value: number,
  mode: "score" | "level",
  suffix = "",
): string {
  if (mode === "score") return `${value}${suffix}`;
  return LEVEL_META[toLevel(value)].label;
}
