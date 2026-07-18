import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] select-none",
  {
    variants: {
      variant: {
        primary:
          "text-white shadow-lg shadow-[var(--brand-soft)] bg-[linear-gradient(120deg,var(--brand),color-mix(in_oklab,var(--brand),var(--brand-2)_55%))] hover:brightness-110",
        secondary:
          "glass text-foreground hover:bg-[var(--card-hover)] border border-[var(--border)]",
        ghost: "text-muted hover:text-foreground hover:bg-[var(--card)]",
        outline:
          "border border-[var(--border-strong)] text-foreground hover:bg-[var(--card)]",
        danger:
          "text-white bg-[var(--loss)] hover:brightness-110 shadow-lg shadow-[var(--loss-soft)]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
