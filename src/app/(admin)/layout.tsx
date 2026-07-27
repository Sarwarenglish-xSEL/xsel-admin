import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { getCurrentProfile } from "@/lib/db/profiles";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") {
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <AppSidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        <div className="w-full px-5 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
