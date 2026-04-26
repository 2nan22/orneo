// frontend/src/components/ui/Badge.tsx
type BadgeTone = "blue" | "green" | "dark" | "amber" | "violet";

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const toneStyles: Record<BadgeTone, string> = {
  blue:   "bg-[#2563EB]/10 text-[#2563EB]",
  green:  "bg-[#00C2A8]/12 text-[#008C7A]",
  dark:   "bg-[#0B132B]/8 text-[#0B132B]",
  amber:  "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
};

export default function Badge({ children, tone = "blue", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-black",
        toneStyles[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
