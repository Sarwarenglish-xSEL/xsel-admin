import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AdminModuleGuard } from "@/components/layout/admin-module-guard";
import { ThemedToaster } from "@/components/theme/themed-toaster";
import {
  canAccessPortal,
  getAccessibleModules,
} from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!canAccessPortal(profile.role)) {
    redirect("/login?error=unauthorized");
  }

  const accessibleModules = getAccessibleModules(profile);
  if (profile.role === "manager" && accessibleModules.length === 0) {
    redirect("/login?error=no_modules");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar profile={profile} accessibleModules={accessibleModules} />
      <main className="flex-1 overflow-auto">
        <div className="w-full px-5 py-6 lg:px-8 lg:py-8">
          <AdminModuleGuard profile={profile}>{children}</AdminModuleGuard>
        </div>
      </main>
      <ThemedToaster />
    </div>
  );
}
