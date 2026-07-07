import { AuthToaster } from "@/components/auth/auth-toaster";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-hidden">
      {children}
      <AuthToaster />
    </div>
  );
}
