"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const GEAR_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "대시보드",
    shortLabel: "홈",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "의사결정 일지",
    shortLabel: "일지",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    href: "/goals",
    label: "목표 관리",
    shortLabel: "목표",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "주간 리포트",
    shortLabel: "리포트",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 모바일 헤더 — 사이드바가 없는 모바일 전용 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 sm:hidden">
        <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] bg-clip-text text-lg font-bold text-transparent">
          ORNEO
        </span>
        <Link
          href="/settings"
          aria-label="설정"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          {GEAR_ICON}
        </Link>
      </header>

      <div className="flex flex-1">
        {/* 사이드바 — 데스크톱 전용 */}
        <aside className="hidden sm:flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6">
          {/* 로고 */}
          <div className="mb-8 px-2">
            <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] bg-clip-text text-xl font-bold text-transparent">
              ORNEO
            </span>
            <p className="mt-0.5 text-xs text-[var(--color-text-sub)]">
              오늘의 선택으로, 더 나은 나를.
            </p>
          </div>

          {/* 네비게이션 */}
          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-[var(--color-bg)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]",
                ].join(" ")}
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>

          {/* 사이드바 하단: 설정 + 로그아웃 */}
          <div className="flex flex-col gap-1">
            <Link
              href="/settings"
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/settings")
                  ? "bg-[var(--color-bg)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]",
              ].join(" ")}
            >
              {GEAR_ICON}
              설정
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-sub)] transition-colors hover:bg-[var(--color-bg)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              로그아웃
            </button>
          </div>
        </aside>

        {/* 메인 콘텐츠 — 하단 nav + safe area 높이만큼 padding 확보 */}
        <main className="flex flex-1 flex-col bg-[var(--color-bg)] pb-[calc(64px+env(safe-area-inset-bottom))] sm:pb-0">
          {children}
        </main>
      </div>

      {/* 하단 nav — 모바일 전용 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)] pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="flex">
          {NAV_ITEMS.map(({ href, shortLabel, icon }) => (
            <Link
              key={href}
              href={href}
              className={[
                "flex flex-1 flex-col items-center gap-1 pt-3 pb-2 text-xs font-medium",
                "transition-colors touch-manipulation",
                "focus-visible:outline-none focus-visible:bg-[var(--color-bg)]",
                isActive(href)
                  ? "border-t-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-t-2 border-transparent text-[var(--color-text-sub)]",
              ].join(" ")}
            >
              {icon}
              <span className="text-[10px]">{shortLabel}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
