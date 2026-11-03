import { getProfiles, getCurrentProfile } from "@/lib/db/profiles";
import { getLatestSessionsForUsers } from "@/lib/db/sessions";
import { parsePageParam } from "@/lib/db/pagination";
import { canManageUsers } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { UsersTable } from "@/components/users/users-table";
import { UsersFilters } from "@/components/users/users-filters";
import { ListPagination } from "@/components/list-pagination";
import { PageEmpty } from "@/components/page-states";
import type { ProfileDeviceFilter } from "@/lib/db/profiles";
import type { Profile, UserRole } from "@/types/database";

function parseRole(value?: string): UserRole | undefined {
  if (value === "admin" || value === "manager" || value === "user") {
    return value;
  }
  return undefined;
}

function parseDevice(value?: string): ProfileDeviceFilter | undefined {
  if (value === "registered" || value === "none") return value;
  return undefined;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    role?: string;
    device?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const role = parseRole(params.role);
  const device = parseDevice(params.device);
  const page = parsePageParam(params.page);
  let usersResult;
  let error: string | null = null;
  let currentProfile;

  try {
    [currentProfile, usersResult] = await Promise.all([
      getCurrentProfile(),
      getProfiles({
        search: q,
        role,
        device,
        page,
        pageSize: 20,
      }),
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
  let users: Profile[] = usersResult!.data;
  try {
    const sessionsByUser = await getLatestSessionsForUsers(users.map((u) => u.id));
    users = users.map((user) => ({
      ...user,
      current_device: sessionsByUser.get(user.id) ?? null,
    }));
  } catch {
    // Keep users list usable even if session lookup fails.
    users = users.map((user) => ({ ...user, current_device: null }));
  }
  const hasFilters = Boolean(q || role || device);

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
      <div className="space-y-4">
        <UsersFilters
          initialQuery={q}
          initialRole={role}
          initialDevice={device}
        />
        {users.length === 0 ? (
          <PageEmpty
            title="No users found"
            description={
              hasFilters
                ? "Try a different search term or clear filters."
                : canManage
                  ? "Create a user to get started."
                  : "No users to show."
            }
          />
        ) : (
          <>
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
              searchParams={{
                q,
                role,
                device,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
