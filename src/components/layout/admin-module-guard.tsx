"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Profile } from "@/types/database";
import {
  getDefaultPortalPath,
  getModuleForPath,
  pathnameAllowed,
} from "@/lib/permissions";

export function AdminModuleGuard({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const module = getModuleForPath(pathname);
    if (!module) return;

    if (!pathnameAllowed(profile, pathname)) {
      router.replace(getDefaultPortalPath(profile));
    }
  }, [pathname, profile, router]);

  const module = getModuleForPath(pathname);
  if (module && !pathnameAllowed(profile, pathname)) {
    return null;
  }

  return <>{children}</>;
}
