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
      <Dialog open={open} onOpenChange={setOpen} className="max-w-2xl">
        <DialogContent
          className="flex w-full max-h-[min(40rem,85vh)] flex-col overflow-hidden p-0"
          onClose={() => setOpen(false)}
        >
          <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12 sm:px-7">
            <DialogHeader className="mb-0">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
                <div>
                  <DialogTitle className="text-xl">Create User</DialogTitle>
                  <p className="mt-1 text-sm text-brand/70">
                    Add a staff or student account to the platform
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
              <p className="text-xs leading-relaxed text-brand/65">
                The default password is{" "}
                <span className="font-semibold text-brand">{DEFAULT_USER_PASSWORD}</span>.
                The user can sign in and change it after their first login.
              </p>
            </div>
            <div className="flex shrink-0 justify-end border-t border-brand/15 bg-white px-6 py-4 sm:px-7">
              <Button type="submit" disabled={loading} className="min-w-40">
                {loading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
