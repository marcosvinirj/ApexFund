"use client";

import { cn } from "@/lib/utils";
import { Label } from "./input";

/** Range slider with a live filled track and a value read-out. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  hint,
  className,
}: {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <div className="flex items-baseline justify-between">
          <Label>{label}</Label>
          <span className="tnum text-sm font-semibold text-foreground">
            {format(value)}
          </span>
        </div>
      )}
      <input
        type="range"
        className="range w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(90deg, var(--brand) ${pct}%, var(--border) ${pct}%)`,
        }}
      />
      {hint && <span className="text-xs text-muted-2">{hint}</span>}
    </div>
  );
}
