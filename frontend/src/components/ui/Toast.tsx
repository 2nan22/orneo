// frontend/src/components/ui/Toast.tsx
"use client";

import { useEffect } from "react";

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, onDismiss, duration = 3500 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[var(--color-text)] px-5 py-3 shadow-lg">
      <p className="text-sm font-medium text-white">{message}</p>
    </div>
  );
}
