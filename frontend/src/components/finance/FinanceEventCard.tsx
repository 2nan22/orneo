// frontend/src/components/finance/FinanceEventCard.tsx
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatMeasure } from "@/lib/level";
import type { MeasureMode } from "@/components/ui/MeasurementToggle";
import type { FinanceEvent } from "@/lib/types";

type EventType = FinanceEvent["type"];

interface Props {
  event:       FinanceEvent;
  measureMode: MeasureMode;
  index:       number;
}

const TYPE_TONE: Record<EventType, "blue" | "green" | "amber" | "dark"> = {
  "주식":      "blue",
  "부동산":    "green",
  "금리·환율": "amber",
  "공시":      "dark",
};

export default function FinanceEventCard({ event, measureMode }: Props) {
  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone={TYPE_TONE[event.type]}>{event.type}</Badge>
          <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-[#0B132B]">
            {event.title}
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-400">{event.move}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold text-slate-400">분석 신뢰</p>
          <p className="text-lg font-black text-[#2563EB]">
            {formatMeasure(event.value, measureMode, "%")}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-[var(--radius-2xl)] bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-400">왜 움직였나</p>
          <p className="mt-1 whitespace-pre-line text-sm font-bold text-slate-700">
            {event.context}
          </p>
        </div>
        <div className="rounded-[var(--radius-2xl)] bg-[#2563EB]/[0.07] p-3">
          <p className="text-xs font-black text-[#2563EB]">앞으로 볼 방향</p>
          <p className="mt-1 whitespace-pre-line text-sm font-bold text-[#0B132B]">
            {event.direction}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-400">
        이 데이터는 교육·참고 목적이며 투자 권유가 아닙니다.
      </p>
    </Card>
  );
}
