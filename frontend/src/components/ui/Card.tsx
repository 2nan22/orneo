import { HTMLAttributes } from "react";

type CardVariant = "default" | "gradient" | "point" | "outlined";
type CardPadding = "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  // icon-only usage: <Card as="article"> renders as <article>
  as?: React.ElementType;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-[var(--color-card)] shadow-[var(--shadow-card)] rounded-[var(--radius-2xl)]",
  gradient:
    "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)] text-white shadow-[var(--shadow-card)] rounded-[var(--radius-2xl)]",
  point:
    "bg-[var(--color-point-light)] border border-[var(--color-point)] rounded-[var(--radius-2xl)]",
  outlined:
    "border border-[var(--color-border)] rounded-[var(--radius-2xl)]",
};

const paddingStyles: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  padded,
  variant = "default",
  padding = "md",
  interactive = false,
  as: Component = "div",
  className = "",
  children,
  ...props
}: CardProps) {
  const resolvedPadding = padded === true ? "p-4" : padded === false ? "" : paddingStyles[padding];

  return (
    <Component
      className={[
        variantStyles[variant],
        resolvedPadding,
        interactive
          ? [
              "cursor-pointer",
              "transition-transform duration-150",
              "hover:scale-[1.005] active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
            ].join(" ")
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Component>
  );
}
