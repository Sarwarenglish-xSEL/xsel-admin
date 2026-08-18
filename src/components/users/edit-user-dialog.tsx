"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateUserAction } from "@/app/actions";
import {
  assignableRoles,
  ADMIN_MODULES,
  type AdminModule,
} from "@/lib/permissions";
import { ManagerModulePicker } from "@/components/users/manager-module-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Profile, UserRole } from "@/types/database";

const schema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["superadmin", "admin", "manager", "user"]),
});

type FormValues = z.infer<typeof schema>;

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  user: "User",
};

function normalizeModules(modules: string[] | null | undefined): AdminModule[] {
  if (!modules?.length) return ["dashboard"];
  return ADMIN_MODULES.filter((module) => modules.includes(module));
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  currentUserRole,
}: {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole: UserRole;
}) {
  const [loading, setLoading] = useState(false);
  const [allowedModules, setAllowedModules] = useState<AdminModule[]>(
    normalizeModules(user.allowed_modules)
  );
  const router = useRouter();
  const roles = assignableRoles(currentUserRole);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      full_name: user.full_name || "",
      email: user.email,
      role: user.role as FormValues["role"],
    },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (open) {
      setAllowedModules(normalizeModules(user.allowed_modules));
    }
  }, [open, user.allowed_modules]);

  async function onSubmit(values: FormValues) {
    if (values.role === "manager" && allowedModules.length === 0) {
      toast.error("Select at least one module for the manager");
      return;
    }

    setLoading(true);
    try {
      const result = await updateUserAction(
        user.id,
        values.full_name,
        values.email,
        values.role as UserRole,
        values.role === "manager" ? allowedModules : undefined
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("User updated");
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input placeholder="Jane Doe" {...register("full_name")} />
            {errors.full_name && (
              <p className="mt-1 text-xs text-danger">{errors.full_name.message}</p>
            )}
          </div>
          <div>
            <Label>Email address</Label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="user@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label>Role</Label>
            <Select className="w-full" {...register("role")}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            {errors.role && (
              <p className="mt-1 text-xs text-danger">{errors.role.message}</p>
            )}
          </div>
          {selectedRole === "manager" && (
            <ManagerModulePicker value={allowedModules} onChange={setAllowedModules} />
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
