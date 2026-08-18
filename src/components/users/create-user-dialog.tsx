"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createUserAction } from "@/app/actions";
import { DEFAULT_USER_PASSWORD } from "@/lib/user-defaults";
import {
  assignableRoles,
  type AdminModule,
} from "@/lib/permissions";
import { ManagerModulePicker } from "@/components/users/manager-module-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { UserRole } from "@/types/database";

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

export function CreateUserDialog({ currentUserRole }: { currentUserRole: UserRole }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowedModules, setAllowedModules] = useState<AdminModule[]>(["dashboard"]);
  const router = useRouter();

  const roles = assignableRoles(currentUserRole);
  const defaultRole = roles.includes("user") ? "user" : roles[0];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      role: defaultRole as FormValues["role"],
    },
  });

  const selectedRole = watch("role");

  async function onSubmit(values: FormValues) {
    if (values.role === "manager" && allowedModules.length === 0) {
      toast.error("Select at least one module for the manager");
      return;
    }

    setLoading(true);
    try {
      const result = await createUserAction(
        values.email,
        values.full_name,
        values.role as UserRole,
        values.role === "manager" ? allowedModules : undefined
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (result.needsEmailConfirmation) {
        toast.success(
          `User created. They must confirm their email before signing in. Default password is ${DEFAULT_USER_PASSWORD}.`
        );
      } else {
        toast.success(`User created. Default password is ${DEFAULT_USER_PASSWORD}`);
      }

      setOpen(false);
      reset();
      setAllowedModules(["dashboard"]);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Create User
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
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
            <p className="text-xs leading-relaxed text-gray-500">
              The default password is <span className="font-medium">{DEFAULT_USER_PASSWORD}</span>.
              The user can sign in and change it after their first login.
            </p>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
