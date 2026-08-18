"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";

function ThemeIcons({ isDark }: { isDark: boolean }) {
  return (
    <>
      <Sun
        className={cn(
          "h-4 w-4 transition-all duration-300",
          isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-300",
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        )}
      />
    </>
  );
}

export function ThemeToggle({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "group flex shrink-0 items-center rounded-xl transition-colors",
        collapsed ? "justify-center" : "gap-3",
        className
      )}
    >
      <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand text-white shadow-sm ring-4 ring-brand/20 transition-transform group-hover:scale-[1.03]">
        <ThemeIcons isDark={isDark} />
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate font-sans text-sm font-semibold tracking-tight text-brand-dark">
            {isDark ? "Dark theme" : "Light theme"}
          </span>
          <span className="block truncate font-sans text-xs text-brand/50">
            {isDark ? "Switch to light" : "Switch to dark"}
          </span>
        </span>
      )}
    </button>
  );
}

export function ThemeLogoButton({ className }: { className?: string }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand text-white shadow-sm ring-4 ring-brand/20 transition-transform hover:scale-[1.04]",
        className
      )}
    >
      <ThemeIcons isDark={isDark} />
    </button>
  );
}
