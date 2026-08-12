import { getProfiles, getCurrentProfile } from "@/lib/db/profiles";
import { PageHeader } from "@/components/layout/page-header";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
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

  const isAdmin = currentProfile?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`View users, registered devices, and transfer history${
          !isAdmin ? " (management requires admin)" : ""
        }`}
        actions={isAdmin ? <CreateUserDialog /> : undefined}
      />
      {users!.length === 0 ? (
        <PageEmpty
          title="No users found"
          description={
            isAdmin
              ? "Create a user or try a different search term."
              : "Try a different search term."
          }
        />
      ) : (
        <UsersTable
          users={users!}
          isAdmin={isAdmin}
          currentUserId={currentProfile!.id}
        />
      )}
    </div>
  );
}
