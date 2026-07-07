import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { cn } from "@/lib/utils";

type AuthFormPanelProps = {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
};

export function AuthFormPanel({
  children,
  className,
  scrollable = false,
}: AuthFormPanelProps) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-1 bg-surface-muted",
        /* Grid colors — or change once in globals.css under --color-auth-grid-* */
        "[--cell-border-color:var(--color-auth-grid-border)]",
        "[--cell-fill-color:var(--color-auth-grid-fill)]",
        "[--cell-hover-color:var(--color-auth-grid-hover)]",
        "[--cell-ripple-color:var(--color-auth-grid-ripple)]"
      )}
    >
      <div
        className={cn(
          "relative w-full",
          scrollable ? "min-h-full overflow-y-auto" : "h-full overflow-hidden"
        )}
      >
        <div className={cn("relative w-full", scrollable ? "min-h-full" : "h-full")}>
          <BackgroundRippleEffect cellSize={32} />

          {/* pointer-events-none lets clicks pass through to the grid; only the card captures them */}
          <div
            className={cn(
              "pointer-events-none relative z-10 flex w-full justify-center px-5 py-6 sm:px-8 lg:px-12 lg:py-8 xl:px-16",
              scrollable ? "min-h-full items-start" : "h-full items-center",
              className
            )}
          >
            <div
              className={cn(
                "pointer-events-auto w-full max-w-[420px] shrink-0",
                scrollable && "my-auto py-2"
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
