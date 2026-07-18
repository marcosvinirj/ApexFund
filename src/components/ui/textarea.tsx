import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[96px] w-full rounded-xl border border-[var(--border)] bg-[var(--card-solid)]/60 px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-2 outline-none transition-colors resize-y",
        "focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}
