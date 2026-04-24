import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "text-white font-semibold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] hover:opacity-90 active:opacity-80",
  outline:
    "border border-[var(--color-border)] text-[var(--color-text)] bg-white hover:bg-[var(--color-bg)] active:bg-[var(--color-border)]",
  ghost:
    "text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] active:bg-[var(--color-border)]",
};

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
