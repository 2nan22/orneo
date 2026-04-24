import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export default function Card({ padded = true, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl bg-[var(--color-card)] shadow-sm",
        padded ? "p-6" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
