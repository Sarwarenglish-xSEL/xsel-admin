"use client";

import { useState, useTransition } from "react";
import { Power } from "lucide-react";
import { toast } from "sonner";
import { toggleAppStatusAction } from "@/app/actions";
import { cn } from "@/lib/utils";

export function AppStatusToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAppStatusAction();
      if (!result.ok) {
        toast.error(result.message ?? "Failed to toggle");
        return;
      }
      setEnabled(result.enabled!);
      toast.success(
        result.enabled
          ? "Application is now live"
          : "Application is now offline"
      );
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border px-5 py-3.5 shadow-sm transition-all",
        enabled
          ? "border-success/30 bg-success/5 hover:bg-success/10"
          : "border-danger/30 bg-danger/5 hover:bg-danger/10",
        isPending && "pointer-events-none opacity-60"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          enabled ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
        )}
      >
        <Power className="h-5 w-5" />
      </div>

      <div className="text-left">
        <p className="text-sm font-semibold text-brand-dark">
          {isPending ? "Updating..." : "Application Status"}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              enabled ? "bg-success animate-pulse" : "bg-danger"
            )}
          />
          <span className="text-xs font-medium text-gray-500">
            {enabled ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      <div className="ml-auto">
        <div
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
            enabled ? "bg-success" : "bg-gray-300"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-5" : "translate-x-0"
            )}
          />
        </div>
      </div>
    </button>
  );
}
