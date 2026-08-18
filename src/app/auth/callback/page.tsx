"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Verifying reset link...");

  useEffect(() => {
    const supabase = createClient();

    async function completeAuth() {
      const query = new URLSearchParams(window.location.search);

      if (query.get("error")) {
        setMessage("Reset link expired or invalid.");
        router.replace("/login?error=auth");
        return;
      }

      const tokenHash = query.get("token_hash");
      const type = query.get("type");
      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (error) {
          console.error("[auth/callback] verifyOtp:", error.message);
          setMessage("Reset link expired or invalid.");
          router.replace("/login?error=auth");
          return;
        }
        router.replace("/login/update-password");
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[auth/callback] exchangeCodeForSession:", error.message);
          setMessage("Reset link expired or invalid.");
          router.replace("/login?error=auth");
          return;
        }
        router.replace("/login/update-password");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error("[auth/callback] setSession:", error.message);
          setMessage("Reset link expired or invalid.");
          router.replace("/login?error=auth");
          return;
        }
        router.replace("/login/update-password");
        return;
      }

      setMessage("Reset link expired or invalid.");
      router.replace("/login?error=auth");
    }

    completeAuth();
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}
