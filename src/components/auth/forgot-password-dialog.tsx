"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { requestPasswordResetAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const resetSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ResetForm = z.infer<typeof resetSchema>;

const fieldClassName = cn(
  "h-11 border-gray-200 bg-gray-50/80 pl-10 transition-colors focus:bg-white",
  "[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#f9fafb]",
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#111827]"
);

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  defaultEmail = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (open && defaultEmail) {
      setValue("email", defaultEmail);
    }
  }, [open, defaultEmail, setValue]);

  async function onSubmit(values: ResetForm) {
    setLoading(true);
    try {
      const result = await requestPasswordResetAction(
        values.email,
        window.location.origin
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Reset email sent", {
        description: "Check your inbox for a link to set a new password.",
      });
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="relative overflow-hidden p-0"
        onClose={() => onOpenChange(false)}
      >
        <div className="border-b border-brand/15 bg-gradient-to-br from-brand/18 via-white to-accent/10 px-6 pb-5 pt-6 sm:px-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/20 text-brand ring-4 ring-brand/10">
            <KeyRound className="h-5 w-5" strokeWidth={2} />
          </div>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">
            Reset your password
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            Enter your staff account email. We&apos;ll send you a secure link to choose a
            new password.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 px-6 py-5 sm:px-7 sm:pb-7"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-xs font-medium text-gray-600">
              Email address
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={fieldClassName}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 flex-1 font-semibold shadow-sm shadow-brand/20 sm:flex-none sm:px-6"
            >
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
