"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Radio,
  Receipt,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions";
import type { Profile } from "@/types/database";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/purchases", label: "Purchases", icon: Receipt },
  { href: "/enrollments", label: "Enrollments", icon: GraduationCap },
  { href: "/submissions", label: "Submissions", icon: ClipboardList },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/live", label: "Live Sessions", icon: Radio },
];

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white shadow-sm">
          X
        </div>
        <div>
          <p className="text-sm font-bold text-brand">XSEL Admin</p>
          <p className="text-xs text-gray-400">Learning Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <div className="mb-3 rounded-lg bg-surface px-3 py-2">
          <p className="truncate text-sm font-medium text-gray-900">
            {profile.full_name || profile.email}
          </p>
          <p className="text-xs capitalize text-gray-400">{profile.role}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
