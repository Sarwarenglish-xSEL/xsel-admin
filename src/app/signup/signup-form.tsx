"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signUpAction } from "@/app/actions";
import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthFormPanel } from "@/components/auth/auth-form-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const signupSchema = z
  .object({
    full_name: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    role: z.enum(["superadmin", "admin", "manager", "user"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

const fieldClassName = cn(
  "h-11 border-gray-200 bg-gray-50/80 transition-colors focus:bg-white",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#f9fafb]",
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#111827]"
);

export default function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "manager",
    },
  });

  async function onSubmit(values: SignupForm) {
    setLoading(true);
    try {
      const result = await signUpAction(
        values.email,
        values.password,
        values.full_name,
        values.role as UserRole
      );

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      if (result.needsEmailConfirmation) {
        toast.success("Account created. Check your email to confirm, then sign in.");
        router.push("/login");
        return;
      }

      toast.success("Account created successfully");

      if (values.role === "superadmin" || values.role === "admin" || values.role === "manager") {
        router.push("/dashboard");
      } else {
        router.push("/login?registered=1");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <AuthHeroPanel />

      <AuthFormPanel scrollable>
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-300/20 ring-1 ring-gray-200/70">
            <div className="border-b border-gray-100 px-7 pb-6 pt-7 sm:px-8 sm:pt-8">
              <span className="inline-flex items-center rounded-full bg-brand/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
                Admin Portal
              </span>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                Set up your staff account to get started
              </p>
            </div>

            <div className="px-7 pb-7 pt-5 sm:px-8 sm:pb-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name" className="text-xs font-medium text-gray-600">
                    Full name
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="Jane Doe"
                    className={fieldClassName}
                    {...register("full_name")}
                  />
                  {errors.full_name && (
                    <p className="text-xs text-danger">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-600">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={fieldClassName}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-danger">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs font-medium text-gray-600">
                    Role
                  </Label>
                  <Select id="role" className={cn(fieldClassName, "w-full")} {...register("role")}>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                  </Select>
                  {errors.role && (
                    <p className="text-xs text-danger">{errors.role.message}</p>
                  )}
                  <p className="text-xs leading-relaxed text-gray-500">
                    Superadmin, admin, and manager roles can access this portal (managers need
                    assigned modules).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-gray-600">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    className={fieldClassName}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-danger">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-600">
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm your password"
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
                  {loading ? "Creating account..." : "Sign up"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
      </AuthFormPanel>
    </div>
  );
}
