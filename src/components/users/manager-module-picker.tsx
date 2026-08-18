"use client";

import { ADMIN_MODULES, ADMIN_MODULE_LABELS, type AdminModule } from "@/lib/permissions";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ManagerModulePicker({
  value,
  onChange,
  className,
}: {
  value: AdminModule[];
  onChange: (modules: AdminModule[]) => void;
  className?: string;
}) {
  function toggle(module: AdminModule) {
    if (value.includes(module)) {
      onChange(value.filter((m) => m !== module));
    } else {
      onChange([...value, module]);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Module access</Label>
      <p className="text-xs text-brand/60">
        Choose which admin pages this manager can access.
      </p>
      <div className="grid gap-1.5 rounded-lg border border-brand/20 bg-brand/[0.03] p-2 sm:grid-cols-2">
        {ADMIN_MODULES.map((module) => {
          const checked = value.includes(module);
          return (
            <label
              key={module}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                checked
                  ? "bg-brand text-white shadow-sm"
                  : "text-brand/70 hover:bg-brand/10 hover:text-brand"
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-brand/30 text-brand accent-brand focus:ring-brand"
                checked={checked}
                onChange={() => toggle(module)}
              />
              <span>{ADMIN_MODULE_LABELS[module]}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
