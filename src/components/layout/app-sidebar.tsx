"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Radio,
  Receipt,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { AdminModule } from "@/lib/permissions";
import type { Profile } from "@/types/database";

const STORAGE_KEY = "xsel-admin-sidebar-collapsed";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/sessions", label: "Sessions", icon: MonitorSmartphone },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/batches", label: "Batches", icon: Layers },
  { href: "/purchases", label: "Purchases", icon: Receipt },
  { href: "/enrollments", label: "Enrollments", icon: GraduationCap },
  { href: "/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/live", label: "Live Sessions", icon: Radio },
];

function getInitials(profile: Profile) {
  if (profile.full_name?.trim()) {
    return profile.full_name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return profile.email.slice(0, 2).toUpperCase();
}

const ROLE_LABELS: Record<Profile["role"], string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  user: "User",
};

const ROLE_BADGE_CLASS: Record<Profile["role"], string> = {
  superadmin: "border-transparent bg-brand text-white",
  admin: "border-transparent bg-brand/15 text-brand",
  manager: "border-transparent bg-accent/20 text-accent-dark",
  user: "border-brand/20 bg-white text-brand",
};

function SidebarUserMenu({ profile }: { profile: Profile }) {
  const hasName = Boolean(profile.full_name?.trim());
  const displayName = profile.full_name?.trim() || profile.email;
  const initials = getInitials(profile);

  return (
    <DropdownMenu
      align="start"
      className="min-w-[18rem] overflow-hidden rounded-xl border-brand/20 p-0 font-sans shadow-xl"
      trigger={
        <button
          type="button"
          aria-label="Open user menu"
          className="flex shrink-0 rounded-full p-0.5 transition-colors hover:bg-brand/5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 font-sans text-xs font-semibold text-brand ring-2 ring-white">
            {initials}
          </div>
        </button>
      }
    >
      <div className="border-b border-brand/15 brand-gradient px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 font-sans text-sm font-semibold text-brand">
            {initials}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate font-sans text-sm font-semibold text-brand-dark">
              {displayName}
            </p>
            {hasName && (
              <p className="mt-0.5 truncate font-sans text-xs text-brand/60">
                {profile.email}
              </p>
            )}
            <Badge
              variant="outline"
              className={cn("mt-2.5 font-sans normal-case", ROLE_BADGE_CLASS[profile.role])}
            >
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-1.5">
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg bg-danger/10 px-3 py-2.5 text-left font-sans text-sm font-semibold text-danger transition-colors hover:bg-danger/15"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </form>
      </div>
    </DropdownMenu>
  );
}

function NavTooltip({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return <>{children}</>;

  return (
    <div className="group/nav relative">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/nav:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

export function AppSidebar({
  profile,
  accessibleModules,
}: {
  profile: Profile;
  accessibleModules: AdminModule[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    }
  }, [collapsed, mounted]);

  return (
    <aside
      className={cn(
        "relative sticky top-0 flex h-screen shrink-0 flex-col border-r border-gray-200/80 bg-white transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[4.25rem]" : "w-64"
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[4.25rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      <div
        className={cn(
          "flex shrink-0 border-b border-brand/20 brand-gradient",
          collapsed
            ? "flex-col items-center gap-2 px-3 py-3"
            : "flex h-16 items-center gap-3 px-4"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "min-w-0 flex-1 gap-3"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white shadow-sm ring-4 ring-brand/20">
            X
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-sm font-semibold tracking-tight text-brand-dark">
                XSEL Admin
              </p>
              <p className="truncate font-sans text-xs text-brand/50">Learning Platform</p>
            </div>
          )}
        </div>
        <SidebarUserMenu profile={profile} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {!collapsed && (
          <p className="mb-2 px-3 font-sans text-[11px] font-semibold uppercase tracking-wider text-brand/50">
            Menu
          </p>
        )}
        {navItems
          .filter((item) => {
            const key = item.href.replace(/^\//, "");
            return accessibleModules.includes(key as AdminModule);
          })
          .map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <NavTooltip key={item.href} label={item.label} show={collapsed}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-brand text-white shadow-sm shadow-brand/20"
                    : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-white" : "text-gray-500"
                  )}
                />
                <span
                  className={cn(
                    "truncate transition-all duration-300",
                    collapsed ? "w-0 opacity-0" : "opacity-100"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </NavTooltip>
          );
        })}
      </nav>
    </aside>
  );
}
