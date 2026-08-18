"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemedToaster() {
  const { theme, mounted } = useTheme();

  return <Toaster richColors theme={mounted ? theme : "light"} position="top-right" />;
}
