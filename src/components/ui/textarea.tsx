import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[80px] w-full resize-y rounded-lg border border-brand/25 bg-white px-3 py-2 font-sans text-sm text-brand-dark",
        "placeholder:text-brand/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
