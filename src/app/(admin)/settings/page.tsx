import { redirect } from "next/navigation";
import { listAppSettings } from "@/lib/db/app-settings";
import { getCurrentProfile } from "@/lib/db/profiles";
import { hasFullModuleAccess } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { AppSettingsForm } from "@/components/settings/app-settings-form";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile || !hasFullModuleAccess(profile.role)) {
    redirect("/dashboard");
  }

  let settings;
  let error: string | null = null;

  try {
    settings = await listAppSettings();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load settings";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="Manage application configuration keys"
        />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage integration keys and app configuration. Course publish status stays on the Dashboard."
      />
      <AppSettingsForm settings={settings!} />
    </div>
  );
}
