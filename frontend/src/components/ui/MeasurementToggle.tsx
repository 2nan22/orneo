// frontend/src/components/ui/MeasurementToggle.tsx
export type MeasureMode = "score" | "level";

interface Props {
  mode: MeasureMode;
  setMode: (mode: MeasureMode) => void;
}

export default function MeasurementToggle({ mode, setMode }: Props) {
  return (
    <div className="grid grid-cols-2 rounded-[var(--radius-2xl)] bg-slate-100 p-1">
      {(["score", "level"] as const).map((id) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          className={[
            "h-10 rounded-[var(--radius-lg)] text-xs font-black transition-all",
            mode === id
              ? "bg-white text-[#2563EB] shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          {id === "score" ? "점수로 보기" : "5단계로 보기"}
        </button>
      ))}
    </div>
  );
}
