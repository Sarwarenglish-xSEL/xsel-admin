import { getProfiles, getCurrentProfile } from "@/lib/db/profiles";
import { parsePageParam } from "@/lib/db/pagination";
import { canManageUsers } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { UsersTable } from "@/components/users/users-table";
import { ListPagination } from "@/components/list-pagination";
import { PageEmpty } from "@/components/page-states";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  let usersResult;
  let error: string | null = null;
  let currentProfile;

  try {
    [currentProfile, usersResult] = await Promise.all([
      getCurrentProfile(),
      getProfiles(q, { page }),
    ]);
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
  const users = usersResult!.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage accounts, devices, and transfer allowances"
        actions={
          canManage ? (
            <CreateUserDialog currentUserRole={currentProfile!.role} />
          ) : undefined
        }
      />
      {users.length === 0 ? (
        <PageEmpty
          title="No users found"
          description={
            canManage
              ? "Create a user or try a different search term."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="space-y-4">
          <UsersTable
            users={users}
            canManage={canManage}
            currentUserId={currentProfile!.id}
            currentUserRole={currentProfile!.role}
          />
          <ListPagination
            page={usersResult!.page}
            totalPages={usersResult!.totalPages}
            total={usersResult!.total}
            pageSize={usersResult!.pageSize}
            searchParams={{ q }}
          />
        </div>
      )}
    </div>
  );
}
