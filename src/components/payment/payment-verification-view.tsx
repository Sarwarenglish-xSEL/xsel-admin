"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  CloudUpload,
  Copy,
  Send,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Course, Purchase } from "@/types/database";
import { submitPurchaseReceiptAction } from "@/app/actions";
import { uploadFile } from "@/lib/db/storage";
import { createClient } from "@/lib/supabase/client";
import {
  bankDetails,
  easyPaisaDetails,
  jazzCashDetails,
  RECEIPT_ACCEPT,
  RECEIPT_MAX_BYTES,
} from "@/lib/payment-config";
import { PaymentAuthForm } from "@/components/payment/payment-auth-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = Object.keys(RECEIPT_ACCEPT);

type PaymentTab = "bank" | "easypaisa" | "jazzcash";

const PAYMENT_TABS: {
  id: PaymentTab;
  label: string;
  icon: ReactNode;
}[] = [
  { id: "bank", label: "Bank Transfer", icon: <Building2 className="h-4 w-4" /> },
  { id: "easypaisa", label: "EasyPaisa", icon: <Smartphone className="h-4 w-4" /> },
  { id: "jazzcash", label: "JazzCash", icon: <Smartphone className="h-4 w-4" /> },
];

function CopyField({ label, value }: { label: string; value: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 transition-colors hover:border-gray-200 hover:bg-white">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="mt-0.5 truncate font-medium text-gray-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-brand/10 hover:text-brand"
        aria-label={`Copy ${label}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PaymentMethodsPanel() {
  const [activeTab, setActiveTab] = useState<PaymentTab>("bank");

  const tabContent: Record<PaymentTab, { label: string; value: string }[]> = {
    bank: [
      { label: "Bank Name", value: bankDetails.bankName },
      { label: "Account Holder", value: bankDetails.accountHolder },
      { label: "Account Number", value: bankDetails.accountNumber },
      { label: "IBAN Code", value: bankDetails.iban },
    ],
    easypaisa: [
      { label: "Account Name", value: easyPaisaDetails.accountName },
      { label: "Account Number", value: easyPaisaDetails.accountNumber },
    ],
    jazzcash: [
      { label: "Account Name", value: jazzCashDetails.accountName },
      { label: "Account Number", value: jazzCashDetails.accountNumber },
    ],
  };

  const hints: Record<PaymentTab, string> = {
    bank: "Transfer the exact course amount to the account below.",
    easypaisa: "Send payment via EasyPaisa mobile wallet.",
    jazzcash: "Send payment via JazzCash mobile wallet.",
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-gray-900">Payment details</h2>
        <p className="mt-0.5 text-sm text-gray-500">Choose a method and copy the account info</p>
      </div>

      <div className="flex gap-1 border-b border-gray-100 bg-gray-50/60 p-1.5 sm:px-2">
        {PAYMENT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:text-sm",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">
              {tab.id === "bank" ? "Bank" : tab.id === "easypaisa" ? "EasyPaisa" : "JazzCash"}
            </span>
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6">
        <p className="mb-4 text-sm text-gray-500">{hints[activeTab]}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {tabContent[activeTab].map((field) => (
            <CopyField
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CourseSummaryBar({ course }: { course: Course }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/80 sm:h-16 sm:w-16">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xl font-bold text-brand">
            {course.title.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Course checkout
        </p>
        <h2 className="mt-0.5 truncate text-base font-semibold text-gray-900 sm:text-lg">
          {course.title}
        </h2>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-gray-400">Total due</p>
        <p className="text-xl font-bold text-brand sm:text-2xl">
          ${Number(course.price).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function StatusMessage({ purchase }: { purchase: Purchase }) {
  const messages = {
    pending: {
      title: "Payment under review",
      description:
        "We received your receipt. An admin will verify your payment shortly.",
      className: "border-amber-200 bg-amber-50 text-amber-900",
      icon: <CloudUpload className="h-5 w-5 text-amber-600" />,
    },
    approved: {
      title: "Payment approved",
      description: "Your enrollment is active. You can return to the app.",
      className: "border-green-200 bg-green-50 text-green-900",
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    },
    rejected: {
      title: "Payment rejected",
      description:
        purchase.admin_note ??
        "Your payment was not approved. Please contact support or submit again.",
      className: "border-red-200 bg-red-50 text-red-900",
      icon: <X className="h-5 w-5 text-red-600" />,
    },
  } as const;

  const info = messages[purchase.status];

  return (
    <div className={cn("rounded-2xl border p-5 sm:p-6", info.className)}>
      <div className="flex items-start gap-3">
        {info.icon}
        <div>
          <h2 className="font-semibold">{info.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed opacity-90">{info.description}</p>
        </div>
      </div>
    </div>
  );
}

function ReceiptUploadForm({
  course,
  courseId,
  userId,
  userEmail,
}: {
  course: Course;
  courseId: string;
  userId: string;
  userEmail: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const validateFile = useCallback((next: File) => {
    if (!ACCEPTED_TYPES.includes(next.type)) {
      toast.error("Please upload a JPG, PNG, or PDF file.");
      return false;
    }
    if (next.size > RECEIPT_MAX_BYTES) {
      toast.error("File must be 5MB or smaller.");
      return false;
    }
    return true;
  }, []);

  function setReceiptFile(next: File) {
    if (!validateFile(next)) return;
    setFile(next);
    if (preview) URL.revokeObjectURL(preview);
    if (next.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(next));
    } else {
      setPreview(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setReceiptFile(dropped);
  }

  async function onSubmit() {
    if (!file) {
      toast.error("Please select a receipt to upload.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${courseId}/${Date.now()}.${ext}`;
      const receiptUrl = await uploadFile("purchase-receipts", path, file);
      await submitPurchaseReceiptAction(courseId, userId, receiptUrl);
      setSubmitted(true);
      toast.success("Receipt submitted for verification");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <StatusMessage
        purchase={{
          id: "",
          user_id: userId,
          course_id: courseId,
          amount: Number(course.price),
          status: "pending",
          receipt_url: null,
          admin_note: null,
          created_at: new Date().toISOString(),
          approved_at: null,
        }}
      />
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            2
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Upload receipt</h2>
            <p className="text-sm text-gray-500">
              {userEmail} · User {userId.slice(0, 8)}…
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
            dragOver
              ? "border-brand bg-brand/5"
              : "border-gray-200 bg-gray-50/50 hover:border-brand/40 hover:bg-brand/5"
          )}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
            <CloudUpload className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-800">
            {file ? file.name : "Drop receipt here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-gray-400">JPG, PNG or PDF · Max 5MB</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) setReceiptFile(selected);
            }}
          />
        </div>

        {preview && (
          <div className="relative mt-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Receipt preview"
              className="max-h-40 w-full object-contain p-2"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {file && !preview && (
          <p className="mt-3 text-center text-sm text-gray-500">PDF ready: {file.name}</p>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Button
            className="h-11 flex-1 gap-2 font-semibold"
            disabled={loading || !file}
            onClick={onSubmit}
          >
            {loading ? "Submitting..." : "Submit for verification"}
            {!loading && <Send className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:w-auto"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.close();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </section>
  );
}

function StepBadge({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
        {step}
      </span>
      <span className="font-medium text-gray-700">{label}</span>
    </div>
  );
}

export function InvalidPaymentLink({ courseId }: { courseId: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f4f6f8] px-4">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Invalid payment link</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          A valid <strong>userId</strong> is required together with the course ID.
          Open this page from the app using:
        </p>
        <code className="mt-4 block break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
          /payment/{courseId}?userId=YOUR_USER_ID
        </code>
      </div>
    </div>
  );
}

export function PaymentVerificationView({
  course,
  courseId,
  userId,
  userEmail,
  userIdMismatch,
  existingPurchase,
}: {
  course: Course;
  courseId: string;
  userId: string;
  userEmail: string | null;
  userIdMismatch: boolean;
  existingPurchase: Purchase | null;
}) {
  const showUpload =
    !existingPurchase || existingPurchase.status === "rejected";

  return (
    <div className="min-h-dvh bg-[#f4f6f8]">
      <div className="border-b border-gray-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
              XSEL Learning
            </p>
            <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">
              Payment verification
            </h1>
          </div>
          <p className="hidden text-xs text-gray-400 sm:block">
            Review within 24–48 hours
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <CourseSummaryBar course={course} />

        {userIdMismatch ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
            <h2 className="font-semibold">Account mismatch</h2>
            <p className="mt-2 text-sm">
              The signed-in account does not match user{" "}
              <span className="font-mono text-xs">{userId}</span> from the app.
              Sign in with the correct account or reopen the payment link from
              the app.
            </p>
          </div>
        ) : !userEmail ? (
          <div className="mt-6 max-w-md">
            <PaymentAuthForm />
          </div>
        ) : existingPurchase && existingPurchase.status !== "rejected" ? (
          <div className="mt-6">
            <StatusMessage purchase={existingPurchase} />
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-5 lg:gap-8">
            <div className="lg:col-span-3">
              <div className="mb-3">
                <StepBadge step={1} label="Send payment" />
              </div>
              <PaymentMethodsPanel />
            </div>

            <div className="lg:col-span-2">
              {showUpload && (
                <ReceiptUploadForm
                  course={course}
                  courseId={courseId}
                  userId={userId}
                  userEmail={userEmail}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
