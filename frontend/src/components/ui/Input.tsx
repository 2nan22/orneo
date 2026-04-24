import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className = "", id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-[var(--color-text)]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={[
          "w-full rounded-xl border bg-white px-4 py-3 text-sm text-[var(--color-text)]",
          "placeholder:text-[var(--color-text-sub)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]",
          "transition-all",
          error
            ? "border-red-400 focus:ring-red-400"
            : "border-[var(--color-border)]",
          className,
        ].join(" ")}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
