import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" | "success" | "warning" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variant === "default" && "bg-brand/20 text-brand",
        variant === "outline" && "border border-brand/20 text-brand",
        variant === "success" && "bg-success/15 text-success",
        variant === "warning" && "bg-accent/25 text-accent-dark",
        className
      )}
      {...props}
    />
  );
}
