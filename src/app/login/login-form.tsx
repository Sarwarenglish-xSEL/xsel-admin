"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signInAction } from "@/app/actions";
import { AuthHeroPanel } from "@/components/auth/auth-hero-panel";
import { AuthFormPanel } from "@/components/auth/auth-form-panel";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

const fieldClassName = cn(
  "h-11 border-brand/25 bg-white",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#ffffff]",
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#02143d]"
);

const portalAccessToast = (description?: string) =>
  toast.error("Access denied", {
    description:
      description ?? "Only staff accounts (superadmin, admin, or manager) can sign in.",
    duration: 5000,
  });

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const unauthorized = searchParams.get("error") === "unauthorized";
  const noModules = searchParams.get("error") === "no_modules";
  const authError = searchParams.get("error") === "auth";
  const registered = searchParams.get("registered") === "1";

  useEffect(() => {
    if (unauthorized) {
      portalAccessToast();
    }
    if (noModules) {
      portalAccessToast("Your manager account has no assigned modules. Contact an admin.");
    }
    if (authError) {
      toast.error("Reset link expired or invalid", {
        description: "Request a new password reset email from the login page.",
      });
    }
  }, [unauthorized, noModules, authError]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginEmail = watch("email");

  async function onSubmit(values: LoginForm) {
    setLoading(true);
    try {
      const result = await signInAction(values.email, values.password);
      if (!result.ok) {
        if (result.message === "You do not have access to this portal") {
          portalAccessToast();
          return;
        }
        toast.error(result.message || "Login failed");
        return;
      }
      toast.success("Login successful");
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <AuthHeroPanel />

      <AuthFormPanel>
        <div className="overflow-hidden rounded-2xl border border-brand/20 bg-white shadow-xl shadow-brand/10">
            <div className="border-b border-brand/15 brand-gradient px-7 py-6 sm:px-8">
              <span className="inline-flex items-center rounded-full bg-brand/15 px-3 py-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-brand">
                Admin Portal
              </span>
              <div className="mt-4 flex items-start gap-3">
                <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
                <div>
                  <h1 className="font-sans text-2xl font-bold tracking-tight text-brand-dark">
                    Welcome back
                  </h1>
                  <p className="mt-1.5 font-sans text-sm leading-relaxed text-brand/70">
                    Sign in to manage your learning platform
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white px-7 pb-7 pt-5 sm:px-8 sm:pb-8">
              {registered && (
                <Alert className="mb-4 border-brand/30 bg-brand/10 py-2.5">
                  <AlertDescription className="text-xs leading-relaxed text-brand/70 sm:text-sm">
                    Account created. Sign in to continue. Only admin accounts can access
                    this portal.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={fieldClassName}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Label htmlFor="password" className="mb-0">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setResetOpen(true)}
                      className="font-sans text-xs font-medium text-brand transition-colors hover:text-brand-dark hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={fieldClassName}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="mt-1 h-11 w-full text-sm font-semibold shadow-sm shadow-brand/20"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </div>
          </div>
      </AuthFormPanel>

      <ForgotPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        defaultEmail={loginEmail}
      />
    </div>
  );
}
