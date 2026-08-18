import type { Metadata } from "next";
import { ThemedToaster } from "@/components/theme/themed-toaster";

export const metadata: Metadata = {
  title: "Payment Verification | XSEL",
  description: "Upload your payment receipt to access your course",
};

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ThemedToaster />
    </>
  );
}
