"use client";

import { Toaster } from "sonner";

export function AuthToaster() {
  return (
    <Toaster
      className="auth-toaster"
      richColors
      position="top-right"
      expand={false}
      visibleToasts={3}
      offset={{ top: 24, right: 24 }}
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border shadow-lg shadow-gray-900/10 ring-1 ring-gray-900/5 backdrop-blur-sm",
          title: "text-sm font-semibold",
          description: "text-xs",
        },
      }}
    />
  );
}
