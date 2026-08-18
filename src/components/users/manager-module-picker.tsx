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
      <p className="text-xs text-gray-500">
        Choose which admin pages this manager can access.
      </p>
      <div className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3 sm:grid-cols-2">
        {ADMIN_MODULES.map((module) => {
          const checked = value.includes(module);
          return (
            <label
              key={module}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                checked ? "bg-brand/5 text-gray-900" : "text-gray-600 hover:bg-gray-100/80"
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
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
