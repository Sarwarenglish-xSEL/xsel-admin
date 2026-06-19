import { Suspense } from "react";
import LoginPage from "./login-form";

function LoginFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-gray-100">
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPage />
    </Suspense>
  );
}
