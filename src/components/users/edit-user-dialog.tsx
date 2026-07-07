"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updateUserAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Profile, UserRole } from "@/types/database";

const schema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["admin", "manager", "user"]),
});

type FormValues = z.infer<typeof schema>;

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      full_name: user.full_name || "",
      email: user.email,
      role: user.role,
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const result = await updateUserAction(
        user.id,
        values.full_name,
        values.email,
        values.role as UserRole
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
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
            </Select>
            {errors.role && (
              <p className="mt-1 text-xs text-danger">{errors.role.message}</p>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
