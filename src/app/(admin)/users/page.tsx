import { getProfiles, getCurrentProfile } from "@/lib/db/profiles";
import { canManageUsers } from "@/lib/permissions";
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

  const canManage = canManageUsers(currentProfile!.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={`View users, registered devices, and transfer history${
          !canManage ? " (management requires admin)" : ""
        }`}
        actions={
          canManage ? (
            <CreateUserDialog currentUserRole={currentProfile!.role} />
          ) : undefined
        }
      />
      {users!.length === 0 ? (
        <PageEmpty
          title="No users found"
          description={
            canManage
              ? "Create a user or try a different search term."
              : "Try a different search term."
          }
        />
      ) : (
        <UsersTable
          users={users!}
          canManage={canManage}
          currentUserId={currentProfile!.id}
          currentUserRole={currentProfile!.role}
        />
      )}
    </div>
  );
}
