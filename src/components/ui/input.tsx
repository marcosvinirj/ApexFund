"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-medium text-muted uppercase tracking-wide",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  onFocus,
  onMouseUp,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  // Number fields: select the whole value on focus so typing replaces it —
  // otherwise a leading "0" is sticky (you can't just clear it and type).
  const justFocused = useRef(false);
  const isNumber = props.type === "number";
  return (
    <input
      onFocus={(e) => {
        if (isNumber) {
          e.currentTarget.select();
          justFocused.current = true;
        }
        onFocus?.(e);
      }}
      onMouseUp={(e) => {
        // Keep the click that focused us from collapsing that auto-selection,
        // but only the first time — later clicks still position the caret.
        if (isNumber && justFocused.current) {
          justFocused.current = false;
          e.preventDefault();
        }
        onMouseUp?.(e);
      }}
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-solid)]/60 px-3 text-sm text-foreground",
        "placeholder:text-muted-2 outline-none transition-colors",
        "focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-solid)]/60 px-3 text-sm text-foreground",
        "outline-none transition-colors focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}

/** Currency / number field with a leading adornment (e.g. €). */
export function Field({
  label,
  suffix,
  prefix,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      <div className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-3 text-sm text-muted-2">
            {prefix}
          </span>
        )}
        <Input
          className={cn(prefix && "pl-7", suffix && "pr-10", "tnum", className)}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 text-sm text-muted-2">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
