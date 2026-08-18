import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "block h-9 w-full min-w-0 max-w-full rounded-lg border border-brand/25 bg-white px-3 font-sans text-sm text-brand-dark",
        "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
