"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/journal", label: "의사결정 일지" },
  { href: "/reports", label: "주간 복기" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6">
        <div className="mb-8 px-2">
          <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] bg-clip-text text-xl font-bold text-transparent">
            ORNEO
          </span>
          <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
            오늘의 선택으로, 더 나은 나를.
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={[
                "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-[var(--color-bg)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-sub)] transition-colors hover:bg-[var(--color-bg)]"
        >
          로그아웃
        </button>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col bg-[var(--color-bg)]">
        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
