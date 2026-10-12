"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { getSearchSuggestionsAction } from "@/app/actions";
import type {
  SearchSuggestion,
  SearchSuggestScope,
} from "@/lib/db/search-suggestions";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SUGGEST_DEBOUNCE_MS = 220;
const SEARCH_DEBOUNCE_MS = 350;

export function ListSearch({
  initialQuery = "",
  placeholder = "Search...",
  preserveParams = {},
  className,
  suggestScope,
}: {
  initialQuery?: string;
  placeholder?: string;
  preserveParams?: Record<string, string | undefined>;
  className?: string;
  /** When set, shows live hint suggestions while typing. */
  suggestScope?: SearchSuggestScope;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingHints, setLoadingHints] = useState(false);
  const [isPending, startTransition] = useTransition();
  const lastNavigated = useRef(initialQuery.trim());
  const preserveParamsRef = useRef(preserveParams);
  preserveParamsRef.current = preserveParams;

  useEffect(() => {
    setValue(initialQuery);
    lastNavigated.current = initialQuery.trim();
  }, [initialQuery]);

  function navigate(nextQuery: string) {
    const trimmed = nextQuery.trim();
    if (trimmed === lastNavigated.current) return;
    lastNavigated.current = trimmed;

    const params = new URLSearchParams();
    for (const [key, paramValue] of Object.entries(preserveParamsRef.current)) {
      if (paramValue && key !== "q" && key !== "page") {
        params.set(key, paramValue);
      }
    }
    if (trimmed) params.set("q", trimmed);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  // Live search: update results as the user types (no Enter needed).
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (value.trim() !== lastNavigated.current) {
        navigate(value);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [value, pathname]);

  // Live hints: fetch suggestions while typing.
  useEffect(() => {
    if (!suggestScope) return;

    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoadingHints(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoadingHints(true);
    const handle = window.setTimeout(async () => {
      try {
        const rows = await getSearchSuggestionsAction(suggestScope, trimmed);
        if (!cancelled) {
          setSuggestions(rows);
          setOpen(true);
          setActiveIndex(-1);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) setLoadingHints(false);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value, suggestScope]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pickSuggestion(item: SearchSuggestion) {
    setValue(item.value);
    setOpen(false);
    setActiveIndex(-1);
    navigate(item.value);
  }

  const showHints =
    Boolean(suggestScope) && open && value.trim().length > 0;

  return (
    <div ref={rootRef} className={cn("relative max-w-md flex-1", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (activeIndex >= 0 && suggestions[activeIndex]) {
            pickSuggestion(suggestions[activeIndex]);
            return;
          }
          setOpen(false);
          navigate(value);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-brand/45" />
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (value.trim() && suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!showHints || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) =>
                i < suggestions.length - 1 ? i + 1 : 0
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) =>
                i <= 0 ? suggestions.length - 1 : i - 1
              );
            } else if (e.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder={placeholder}
          className={cn("pl-9", (value || loadingHints || isPending) && "pr-9")}
          aria-label={placeholder}
          aria-autocomplete={suggestScope ? "list" : undefined}
          aria-controls={suggestScope ? listId : undefined}
          aria-expanded={suggestScope ? showHints : undefined}
          role={suggestScope ? "combobox" : undefined}
          autoComplete="off"
        />
        {loadingHints || isPending ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand/45" />
        ) : value ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-brand/50 hover:bg-brand/5 hover:text-brand"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              setSuggestions([]);
              setOpen(false);
              navigate("");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </form>

      {showHints ? (
        <div
          id={listId}
          role="listbox"
          className="brand-scrollbar absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-64 overflow-y-auto rounded-xl border border-brand/20 bg-surface py-1 shadow-lg"
        >
          {suggestions.length === 0 && !loadingHints ? (
            <p className="px-3 py-2.5 text-sm text-gray-500">No matches</p>
          ) : (
            suggestions.map((item, index) => (
              <button
                key={`${item.value}-${item.detail ?? ""}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors",
                  index === activeIndex
                    ? "bg-brand/10 text-brand-dark"
                    : "hover:bg-brand/5"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(item)}
              >
                <span className="truncate text-sm font-medium text-brand-dark">
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="truncate text-xs text-gray-500">
                    {item.detail}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
