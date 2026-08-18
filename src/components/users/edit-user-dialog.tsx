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

const MAX_TRANSFERS = 2;

const schema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["superadmin", "admin", "manager", "user"]),
  device_transfer_count: z.coerce
    .number()
    .int()
    .min(0, "Transfers cannot be negative")
    .max(MAX_TRANSFERS, `Transfers cannot exceed ${MAX_TRANSFERS}`),
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

function clampTransfers(value: number | null | undefined) {
  return Math.min(MAX_TRANSFERS, Math.max(0, value ?? 0));
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
      device_transfer_count: clampTransfers(user.device_transfer_count),
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
        values.role === "manager" ? allowedModules : undefined,
        clampTransfers(values.device_transfer_count)
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
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogContent
        className="flex w-full max-h-[min(40rem,85vh)] flex-col overflow-hidden p-0"
        onClose={() => onOpenChange(false)}
      >
        <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12 sm:px-7">
          <DialogHeader className="mb-0">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
              <div>
                <DialogTitle className="text-xl">Edit User</DialogTitle>
                <p className="mt-1 text-sm text-brand/70">
                  Update profile details and transfer allowance
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="brand-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div>
                <Label>Transfers</Label>
                <Input
                  type="number"
                  min={0}
                  max={MAX_TRANSFERS}
                  step={1}
                  inputMode="numeric"
                  {...register("device_transfer_count")}
                />
                <p className="mt-1.5 text-xs text-brand/60">Maximum {MAX_TRANSFERS}</p>
                {errors.device_transfer_count && (
                  <p className="mt-1 text-xs text-danger">
                    {errors.device_transfer_count.message}
                  </p>
                )}
              </div>
            </div>
            {selectedRole === "manager" && (
              <ManagerModulePicker value={allowedModules} onChange={setAllowedModules} />
            )}
          </div>
          <div className="flex shrink-0 justify-end border-t border-brand/15 bg-white px-6 py-4 sm:px-7">
            <Button type="submit" disabled={loading} className="min-w-40">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
