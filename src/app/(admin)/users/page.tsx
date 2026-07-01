import { getProfiles, getCurrentProfile } from "@/lib/db/profiles";
import { PageHeader } from "@/components/layout/page-header";
import { UsersTable } from "@/components/users/users-table";
import { PageEmpty } from "@/components/page-states";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let users;
  let error: string | null = null;
  let currentProfile;

  try {
    [currentProfile, users] = await Promise.all([getCurrentProfile(), getProfiles(q)]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load users";
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users" description="Manage platform users and roles" />
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`Manage platform users and roles${
          currentProfile?.role !== "admin" ? " (role changes require admin)" : ""
        }`}
      />
      {users!.length === 0 ? (
        <PageEmpty title="No users found" description="Try a different search term." />
      ) : (
        <UsersTable
          users={users!}
          isAdmin={currentProfile?.role === "admin"}
        />
      )}
    </div>
  );
}
