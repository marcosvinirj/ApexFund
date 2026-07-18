"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const interactive = !!onChange;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          className={cn(
            "rounded-md transition-transform",
            interactive && "hover:scale-110",
            !interactive && "cursor-default",
          )}
          aria-label={`${n} estrelas`}
        >
          <Star
            style={{ width: size, height: size }}
            className={
              n <= value
                ? "fill-[var(--warn)] text-[var(--warn)]"
                : "text-[var(--muted-2)]"
            }
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  );
}
