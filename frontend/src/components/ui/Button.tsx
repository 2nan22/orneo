import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger" | "point";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "text-white font-semibold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] hover:opacity-90 active:opacity-80 focus-visible:ring-[var(--color-primary)]",
  outline:
    "border border-[var(--color-border)] text-[var(--color-text)] bg-white hover:bg-[var(--color-bg)] active:bg-[var(--color-border)] focus-visible:ring-[var(--color-primary)]",
  ghost:
    "text-[var(--color-text-sub)] hover:bg-[var(--color-bg)] active:bg-[var(--color-border)] focus-visible:ring-[var(--color-primary)]",
  danger:
    "text-white font-semibold bg-[var(--color-danger)] hover:opacity-90 active:opacity-80 focus-visible:ring-[var(--color-danger)]",
  point:
    "text-white font-semibold bg-[var(--color-point)] hover:opacity-90 active:opacity-80 focus-visible:ring-[var(--color-point)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs rounded-[var(--radius-md)] min-h-[36px]",
  md: "px-4 py-3 text-sm rounded-[var(--radius-lg)]",
  lg: "px-6 py-4 text-base rounded-[var(--radius-lg)]",
  // icon-only: pass an SVG as children — text children will break layout
  icon: "h-11 w-11 p-0 rounded-[var(--radius-full)]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      className={[
        "flex items-center justify-center gap-2 transition-all",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "touch-manipulation",
        "active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
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
