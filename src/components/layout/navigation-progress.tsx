"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

function isInternalNavigation(anchor: HTMLAnchorElement, pathname: string): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;

  const nextKey = `${url.pathname}${url.search}`;
  const currentKey = `${pathname}${window.location.search}`;
  return nextKey !== currentKey;
}

/** One smooth professional spinner — used everywhere. */
export function BrandSpinner({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="presentation"
    >
      {/* Soft track */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="currentColor"
          strokeWidth="3.25"
          className="text-brand/15"
        />
      </svg>
      {/* Spinning arc — Tailwind animate-spin is reliable */}
      <svg
        className="absolute inset-0 h-full w-full animate-spin"
        viewBox="0 0 50 50"
        fill="none"
        aria-hidden
        style={{ animationDuration: "0.85s" }}
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="currentColor"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeDasharray="80 200"
          className="text-brand"
        />
      </svg>
    </div>
  );
}

/** Single full-page / route loader — this is the only spinner UI. */
export function AdminRouteLoader() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-brand/10 bg-surface px-10 py-9 shadow-[0_18px_50px_-18px_rgba(4,38,124,0.28)]">
        <BrandSpinner size={56} />
        <div className="text-center">
          <p className="font-sans text-[13px] font-semibold tracking-[0.02em] text-brand-dark">
            Loading
          </p>
          <p className="mt-1.5 font-sans text-[11px] tracking-wide text-brand/50">
            Please wait a moment
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Instant top progress bar on link click.
 * Does NOT render a second spinner — route `loading.tsx` owns the spinner.
 */
function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const prevRouteRef = useRef(routeKey);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (finishRef.current) {
      clearTimeout(finishRef.current);
      finishRef.current = null;
    }
    if (startDelayRef.current) {
      clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearTimers();
    finishRef.current = setTimeout(() => {
      setProgress(100);
      finishRef.current = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 200);
    }, 0);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    startDelayRef.current = setTimeout(() => {
      setActive(true);
      setProgress(10);
      tickRef.current = setInterval(() => {
        setProgress((current) => {
          if (current >= 90) return current;
          const step = current < 45 ? 12 : current < 75 ? 6 : 2;
          return Math.min(90, current + step);
        });
      }, 250);
    }, 0);
  }, [clearTimers]);

  useEffect(() => {
    if (prevRouteRef.current !== routeKey) {
      prevRouteRef.current = routeKey;
      finish();
    }
  }, [routeKey, finish]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigation(anchor, pathname)) return;

      start();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, start]);

  useEffect(() => {
    if (!active) return;
    const safety = setTimeout(finish, 20000);
    return () => clearTimeout(safety);
  }, [active, finish]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden"
      aria-hidden={!active}
    >
      <div
        className={cn(
          "h-full bg-gradient-to-r from-brand via-accent to-brand-light transition-[width,opacity] duration-200 ease-out",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
