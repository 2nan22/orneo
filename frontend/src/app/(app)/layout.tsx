"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import BrandMark from "@/components/ui/BrandMark";
import { MeasureModeProvider } from "@/lib/measureModeContext";
import { ToastProvider } from "@/contexts/ToastContext";

// ─── 인라인 SVG 아이콘 ───────────────────────────────────────────────────────

const HOME_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
);

const STUDIO_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L4 10l5.2-1.8L12 3z" />
    <path d="M19 17l.7 1.8L22 20l-2.3.8L19 23l-.7-2.2L16 20l2.3-1.2L19 17z" />
  </svg>
);

const WALLET_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h13" />
    <path d="M16 13h.01" />
    <path d="M4 7l11-4" />
  </svg>
);

const GROWTH_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="M7 15l4-4 3 3 5-7" />
  </svg>
);

const SETTINGS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4l-.4 3a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.4 3h4l.4-3a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.6.1-1z" />
  </svg>
);

const BELL_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>
);

// ─── 사이드바 전용 내비 (데스크톱) ────────────────────────────────────────────

const SIDEBAR_NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드",      icon: HOME_ICON    },
  { href: "/studio",    label: "Studio",        icon: STUDIO_ICON  },
  { href: "/finance",   label: "Finance",       icon: WALLET_ICON  },
  { href: "/reports",   label: "Review",        icon: GROWTH_ICON  },
  { href: "/settings",  label: "설정",          icon: SETTINGS_ICON},
];

// ─── 하단 nav 5탭 (모바일) ────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard", href: "/dashboard", label: "Home",     icon: HOME_ICON    },
  { id: "studio",    href: "/studio",    label: "Studio",   icon: STUDIO_ICON  },
  { id: "finance",   href: "/finance",   label: "Finance",  icon: WALLET_ICON  },
  { id: "review",    href: "/reports",   label: "Review",   icon: GROWTH_ICON  },
  { id: "settings",  href: "/settings",  label: "Settings", icon: SETTINGS_ICON},
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
    <MeasureModeProvider>
    <ToastProvider>
    <div className="flex min-h-screen flex-col">
      {/* 모바일 TopBar — glassmorphism + BrandMark + 알림 벨 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white/88 px-4 py-3 backdrop-blur-xl sm:hidden">
        <BrandMark showTagline={false} size="sm" />

        <button
          className="relative grid h-10 w-10 place-items-center rounded-[var(--radius-2xl)] border border-slate-200 bg-white text-[#2563EB] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          aria-label="알림"
        >
          {BELL_ICON}
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
        </button>
      </header>

      <div className="flex flex-1">
        {/* 사이드바 — 데스크톱 전용 */}
        <aside className="hidden sm:flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] px-4 py-6">
          <div className="mb-8 px-2">
            <BrandMark showTagline={true} size="md" />
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {SIDEBAR_NAV_ITEMS.map(({ href, label, icon }) => (
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

          {/* 사이드바 하단: 로그아웃 */}
          <div className="flex flex-col gap-1">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-sub)] transition-colors hover:bg-[var(--color-bg)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              로그아웃
            </button>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex flex-1 flex-col bg-[var(--color-bg)] pb-[calc(64px+env(safe-area-inset-bottom))] sm:pb-0">
          {children}
        </main>
      </div>

      {/* 하단 nav — 5탭, 모바일 전용 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 rounded-t-[1.75rem] border-t border-slate-200 bg-white/95 px-2 pb-5 pt-2 shadow-[0_-8px_28px_rgba(12,42,168,0.08)] backdrop-blur sm:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition-colors touch-manipulation",
              "focus-visible:outline-none",
              isActive(item.href)
                ? "text-[#2563EB]"
                : "text-slate-400 hover:text-slate-600",
            ].join(" ")}
          >
            <span
              className={
                isActive(item.href)
                  ? "rounded-full bg-[#2563EB]/10 px-2.5 py-1"
                  : "px-2.5 py-1"
              }
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
    </ToastProvider>
    </MeasureModeProvider>
  );
}
