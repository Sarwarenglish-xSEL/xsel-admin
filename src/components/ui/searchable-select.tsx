"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Check, ChevronDown, Search, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  detail?: string;
};

function optionInitials(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No matches",
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.detail ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const handle = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [open]);

  useEffect(() => {
    function onPointerDown(event: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    setActiveIndex((index) => {
      if (filtered.length === 0) return 0;
      return Math.min(index, filtered.length - 1);
    });
  }, [filtered.length]);

  function selectOption(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  function clearSelection(event: MouseEvent) {
    event.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border bg-surface px-3 text-left font-sans transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open
            ? "border-brand shadow-sm ring-2 ring-brand/15"
            : "border-brand/25 hover:border-brand/40",
          selected ? "text-brand-dark" : "text-brand/45"
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            selected
              ? "bg-brand/12 text-brand"
              : "bg-brand/[0.06] text-brand/40"
          )}
        >
          {selected ? (
            optionInitials(selected.label)
          ) : (
            <UserRound className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-sm font-medium">
                {selected.label}
              </span>
              {selected.detail ? (
                <span className="block truncate text-xs text-brand/55">
                  {selected.detail}
                </span>
              ) : null}
            </>
          ) : (
            <span className="block truncate text-sm">{placeholder}</span>
          )}
        </span>
        {selected ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear selection"
            className="rounded-md p-1 text-brand/40 transition-colors hover:bg-brand/5 hover:text-brand"
            onClick={clearSelection}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-brand/40 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-xl border border-brand/20 bg-surface shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
          <div className="border-b border-brand/10 bg-brand/[0.03] px-3 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand/40" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((index) =>
                      filtered.length === 0
                        ? 0
                        : index < filtered.length - 1
                          ? index + 1
                          : 0
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((index) =>
                      filtered.length === 0
                        ? 0
                        : index <= 0
                          ? filtered.length - 1
                          : index - 1
                    );
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const option = filtered[activeIndex];
                    if (option) selectOption(option.value);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                className="h-8 w-full border-0 bg-transparent pl-6 pr-2 font-sans text-sm text-brand-dark placeholder:text-brand/35 focus:outline-none"
                autoComplete="off"
              />
            </div>
          </div>

          <div
            id={listId}
            role="listbox"
            className="brand-scrollbar max-h-52 overflow-y-auto overscroll-contain p-1.5"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-brand-dark">{emptyText}</p>
                <p className="mt-1 text-xs text-brand/50">
                  Try another name or email
                </p>
              </div>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                      isActive || isSelected
                        ? "bg-brand/[0.08]"
                        : "hover:bg-brand/[0.04]"
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectOption(option.value)}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand">
                      {optionInitials(option.label)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-brand-dark">
                        {option.label}
                      </span>
                      {option.detail ? (
                        <span className="block truncate text-xs text-brand/55">
                          {option.detail}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-brand" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="border-t border-brand/10 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-brand/40">
                {filtered.length} of {options.length} users
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
