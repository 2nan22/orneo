import Link from "next/link";
import Button from "@/components/ui/Button";

export default function JournalPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">의사결정 일지</h1>
        <Link href="/journal/new">
          <Button>새 일지 작성</Button>
        </Link>
      </div>
      <p className="text-sm text-[var(--color-text-sub)]">작성된 일지가 없습니다.</p>
    </div>
  );
}
