// frontend/src/components/ui/Toast.tsx
"use client";

import { useEffect } from "react";

type ToastType = "default" | "success" | "error" | "warning" | "info";

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
  type?: ToastType;
}

const typeStyles: Record<ToastType, string> = {
  default: "bg-[var(--color-text)] text-white",
  success: "bg-[var(--color-success)] text-[var(--color-text)]",
  error:   "bg-[var(--color-danger)] text-white",
  warning: "bg-[var(--color-warning)] text-[var(--color-text)]",
  info:    "bg-[var(--color-primary)] text-white",
};

export default function Toast({ message, onDismiss, duration = 3500, type = "default" }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={[
        "fixed left-1/2 z-50 -translate-x-1/2",
        // 모바일: 하단 nav(64px) + safe-area + 여유 8px 위에 위치
        "bottom-[calc(64px+env(safe-area-inset-bottom)+8px)]",
        // 데스크톱: 기존 bottom-6
        "sm:bottom-6",
        "rounded-[var(--radius-xl)] px-5 py-3 shadow-[var(--shadow-modal)]",
        typeStyles[type],
      ].join(" ")}
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
