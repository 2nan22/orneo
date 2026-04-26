"use client";

import { InputHTMLAttributes, useId } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix"> {
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  success?: boolean;
}

export default function Input({
  label,
  error,
  helperText,
  prefix,
  suffix,
  success = false,
  className = "",
  id,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const describedBy = error
    ? `${inputId}-error`
    : helperText
      ? `${inputId}-helper`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sub)]">
            {prefix}
          </div>
        )}
        <input
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={[
            "w-full rounded-[var(--radius-md)] border bg-white px-4 py-3 text-sm text-[var(--color-text)]",
            "placeholder:text-[var(--color-text-sub)]",
            "transition-all",
            "focus-visible:outline-none focus-visible:ring-2",
            error
              ? "border-[var(--color-danger)] focus-visible:ring-[var(--color-danger)]"
              : success
                ? "border-[var(--color-success)] focus-visible:ring-[var(--color-success)]"
                : "border-[var(--color-border)] focus-visible:ring-[var(--color-primary)]",
            prefix ? "pl-10" : "",
            suffix ? "pr-10" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-sub)]">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-[var(--color-text-sub)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
