// frontend/src/components/reports/HighlightList.tsx

interface Props {
  title: string;
  items: string[];
  variant: "positive" | "negative";
}

export default function HighlightList({ title, items, variant }: Props) {
  const dotColor = variant === "positive" ? "#00C2A8" : "#F59E0B";

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-sub)]">내용이 없습니다.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
