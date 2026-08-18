"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

export function AuthToaster() {
  const { theme, mounted } = useTheme();

  return (
    <Toaster
      className="auth-toaster"
      richColors
      theme={mounted ? theme : "light"}
      position="top-right"
      expand={false}
      visibleToasts={3}
      offset={{ top: 24, right: 24 }}
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border shadow-lg shadow-brand/10 ring-1 ring-brand/10 backdrop-blur-sm",
          title: "text-sm font-semibold",
          description: "text-xs",
        },
      }}
    />
  );
}
