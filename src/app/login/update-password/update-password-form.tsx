"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { updatePasswordAction } from "@/app/actions";
import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthFormPanel } from "@/components/auth/auth-form-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const fieldClassName = cn(
  "h-11 border-gray-200 bg-gray-50/80 transition-colors focus:bg-white",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#f9fafb]",
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#111827]"
);

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const result = await updatePasswordAction(values.password);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Password updated. You can sign in with your new password.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <AuthHeroPanel />

      <AuthFormPanel>
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-300/20 ring-1 ring-gray-200/70">
          <div className="border-b border-gray-100 px-7 pb-6 pt-7 sm:px-8 sm:pt-8">
            <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
              Admin Portal
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
              Set new password
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              Enter a new password for your account
            </p>
          </div>

          <div className="px-7 pb-7 pt-5 sm:px-8 sm:pb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-gray-600">
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  className={fieldClassName}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-danger">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-gray-600"
                >
                  Confirm password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  className={fieldClassName}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-danger">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="mt-1 h-11 w-full text-sm font-semibold shadow-sm shadow-brand/20"
                disabled={loading}
              >
                {loading ? "Saving..." : "Update password"}
              </Button>
            </form>
          </div>
        </div>
      </AuthFormPanel>
    </div>
  );
}
