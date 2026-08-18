import type { Profile, UserRole } from "@/types/database";

/** Module keys match sidebar routes (without leading slash). */
export const ADMIN_MODULES = [
  "dashboard",
  "users",
  "sessions",
  "courses",
  "batches",
  "purchases",
  "enrollments",
  "submissions",
  "certificates",
  "live",
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

export const ADMIN_MODULE_LABELS: Record<AdminModule, string> = {
  dashboard: "Dashboard",
  users: "Users",
  sessions: "Sessions",
  courses: "Courses",
  batches: "Batches",
  purchases: "Purchases",
  enrollments: "Enrollments",
  submissions: "Submissions",
  certificates: "Certificates",
  live: "Live Sessions",
};

const PORTAL_ROLES: UserRole[] = ["superadmin", "admin", "manager"];

export function canAccessPortal(role: UserRole): boolean {
  return PORTAL_ROLES.includes(role);
}

export function hasFullModuleAccess(role: UserRole): boolean {
  return role === "superadmin" || role === "admin";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "superadmin" || role === "admin";
}

/** Roles the current user may assign when creating or editing users. */
export function assignableRoles(currentRole: UserRole): UserRole[] {
  if (currentRole === "superadmin") {
    return ["superadmin", "admin", "manager", "user"];
  }
  if (currentRole === "admin") {
    return ["admin", "manager", "user"];
  }
  return [];
}

export function canAssignRole(currentRole: UserRole, targetRole: UserRole): boolean {
  return assignableRoles(currentRole).includes(targetRole);
}

export function getAccessibleModules(profile: Profile): AdminModule[] {
  if (hasFullModuleAccess(profile.role)) {
    return [...ADMIN_MODULES];
  }
  if (profile.role !== "manager") {
    return [];
  }
  const allowed = profile.allowed_modules ?? [];
  return ADMIN_MODULES.filter((module) => allowed.includes(module));
}

export function canAccessModule(profile: Profile, mod: AdminModule): boolean {
  return getAccessibleModules(profile).includes(mod);
}

export function getModuleForPath(pathname: string): AdminModule | null {
  const segment = pathname.replace(/^\//, "").split("/")[0];
  if (!segment) return null;
  return ADMIN_MODULES.includes(segment as AdminModule)
    ? (segment as AdminModule)
    : null;
}

export function getDefaultPortalPath(profile: Profile): string {
  const modules = getAccessibleModules(profile);
  if (modules.length === 0) return "/login?error=no_modules";
  return `/${modules[0]}`;
}

export function pathnameAllowed(profile: Profile, pathname: string): boolean {
  const mod = getModuleForPath(pathname);
  if (!mod) return true;
  return canAccessModule(profile, mod);
}
