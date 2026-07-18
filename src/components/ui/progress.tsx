"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  barClassName,
  gradient = true,
}: {
  value: number; // 0..1
  className?: string;
  barClassName?: string;
  gradient?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-[var(--border)]",
        className,
      )}
    >
      <motion.div
        className={cn(
          "h-full rounded-full",
          gradient
            ? "bg-[linear-gradient(90deg,var(--brand),var(--brand-2))]"
            : "bg-[var(--brand)]",
          barClassName,
        )}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
