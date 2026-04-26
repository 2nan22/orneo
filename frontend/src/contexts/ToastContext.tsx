// frontend/src/contexts/ToastContext.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "default" | "success" | "error" | "warning" | "info";

export interface ToastItem {
  id:       string;
  message:  string;
  type:     ToastType;
  duration: number;
}

interface ToastContextValue {
  toasts:      ToastItem[];
  addToast:    (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "default", duration = 3500) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      // 최대 3개 유지 (오래된 것부터 제거)
      setToasts((prev) => [...prev.slice(-2), { id, message, type, duration }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        className="fixed left-1/2 z-[60] -translate-x-1/2
                   bottom-[calc(64px+env(safe-area-inset-bottom)+8px)]
                   sm:bottom-6
                   flex flex-col gap-2 items-center"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Pick<ToastContextValue, "addToast"> {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 내부에서만 사용 가능합니다.");
  return { addToast: ctx.addToast };
}

// ─── 개별 Toast 알림 컴포넌트 ────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, string> = {
  default: "bg-[#0B132B] text-white",
  success: "bg-[#22c55e] text-white",
  error:   "bg-[#ef4444] text-white",
  warning: "bg-[#f59e0b] text-[#0B132B]",
  info:    "bg-[#2563EB] text-white",
};

function ToastNotification({
  toast,
  onDismiss,
}: {
  toast:     ToastItem;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={[
        "flex min-w-[200px] max-w-[90vw] items-center gap-3 rounded-[var(--radius-xl)] px-5 py-3",
        "shadow-[var(--shadow-modal)] transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        TYPE_STYLES[toast.type],
      ].join(" ")}
    >
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onDismiss, 200);
        }}
        className="opacity-70 hover:opacity-100"
        aria-label="알림 닫기"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
