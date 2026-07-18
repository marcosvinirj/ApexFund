import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--card-hover)] text-muted border border-[var(--border)]",
        brand: "bg-[var(--brand-soft)] text-[var(--brand)]",
        profit: "bg-[var(--profit-soft)] text-[var(--profit)]",
        loss: "bg-[var(--loss-soft)] text-[var(--loss)]",
        info: "bg-[var(--info-soft)] text-[var(--info)]",
        warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
