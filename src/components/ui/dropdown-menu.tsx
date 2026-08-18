"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DropdownMenuContext = createContext<() => void>(() => {});

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = menuHeight > 0 && spaceBelow < menuHeight + 8 && rect.top > menuHeight + 8;

    setCoords({
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: align === "end" ? rect.right : rect.left,
    });
  }, [align]);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div ref={triggerRef} onClick={() => setOpen((value) => !value)}>
        {trigger}
      </div>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              ref={menuRef}
              className={cn(
                "fixed z-50 min-w-40 rounded-lg border border-brand/20 bg-surface py-1 shadow-lg",
                align === "end" && "-translate-x-full",
                className
              )}
              style={{ top: coords.top, left: coords.left }}
            >
              <DropdownMenuContext.Provider value={close}>{children}</DropdownMenuContext.Provider>
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export function DropdownMenuItem({
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const close = useContext(DropdownMenuContext);

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-sm text-brand-dark hover:bg-brand/5",
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        close();
      }}
      {...props}
    />
  );
}
