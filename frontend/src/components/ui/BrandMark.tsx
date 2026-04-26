// frontend/src/components/ui/BrandMark.tsx
interface BrandMarkProps {
  showTagline?: boolean;
  size?: "sm" | "md";
}

export default function BrandMark({ showTagline = true, size = "md" }: BrandMarkProps) {
  const iconSize  = size === "sm" ? "h-8 w-8 rounded-xl"  : "h-9 w-9 rounded-2xl";
  const textSize  = size === "sm" ? "text-xs"              : "text-sm";
  const subSize   = size === "sm" ? "text-[10px]"          : "text-[11px]";

  return (
    <div className="flex items-center gap-2">
      {/* 아이콘 마크 — CI 로고 기반 */}
      <div className={`relative grid place-items-center bg-[#0B132B] shadow-sm ${iconSize}`}>
        {/* 우상단 포인트 도트 */}
        <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#00C2A8]" />
        {/* 상단 반원 (O 형상) */}
        <div className="h-4 w-5 rounded-t-full border-[5px] border-b-0 border-[#00C2A8]" />
        {/* 우하단 꺾인 라인 (R 형상) */}
        <div className="absolute bottom-2 h-3 w-5 rotate-45 rounded-sm border-b-[5px] border-r-[5px] border-[#2563EB]" />
      </div>

      {/* 텍스트 */}
      <div>
        <p className={`font-black tracking-[0.22em] text-[#0B132B] ${textSize}`}>ORNEO</p>
        {showTagline && (
          <p className={`-mt-0.5 font-semibold text-slate-500 ${subSize}`}>
            오늘의 선택으로, 더 나은 나를.
          </p>
        )}
      </div>
    </div>
  );
}
