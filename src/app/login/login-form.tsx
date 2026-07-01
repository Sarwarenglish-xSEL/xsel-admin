"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { signInAction } from "@/app/actions";
import loginHero from "@/assets/login-hero.png";
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
  "h-11 border-gray-200 bg-gray-50/80 transition-colors focus:bg-white",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#f9fafb]",
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#111827]"
);

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const unauthorized = searchParams.get("error") === "unauthorized";
  const registered = searchParams.get("registered") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    setLoading(true);
    try {
      const result = await signInAction(values.email, values.password);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Signed in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative hidden h-full shrink-0 bg-white lg:block lg:w-[46%] xl:w-1/2">
        <Image
          src={loginHero}
          alt="Sarwar's English Lab — Learn, Practice, Excel"
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
      </div>

      <div className="login-grid-bg flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-6 sm:px-8 lg:px-12 lg:py-8 xl:px-16">
        <div className="w-full max-w-[420px] shrink-0">
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl shadow-gray-300/20 ring-1 ring-gray-200/70">
            <div className="border-b border-gray-100 px-7 pb-6 pt-7 sm:px-8 sm:pt-8">
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
                Admin Portal
              </span>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
                Welcome back
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                Sign in to manage your learning platform
              </p>
            </div>

            <div className="px-7 pb-7 pt-5 sm:px-8 sm:pb-8">
              {registered && (
                <Alert className="mb-4 border-brand/20 bg-brand/5 py-2.5">
                  <AlertDescription className="text-xs leading-relaxed text-gray-600 sm:text-sm">
                    Account created. Sign in to continue. Only admin and manager roles can access
                    this portal.
                  </AlertDescription>
                </Alert>
              )}
              {unauthorized && (
                <Alert variant="destructive" className="mb-4 py-2.5">
                  <AlertDescription className="text-xs sm:text-sm">
                    Access denied. Only admin and manager accounts can use this portal.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  <Label htmlFor="password" className="text-xs font-medium text-gray-600">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={fieldClassName}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-danger">{errors.password.message}</p>
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

              <p className="mt-6 text-center text-sm text-gray-500">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-brand transition-colors hover:text-brand-dark"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
