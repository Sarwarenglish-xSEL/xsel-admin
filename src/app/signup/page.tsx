import { Suspense } from "react";
import SignupForm from "./signup-form";

function SignupFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-surface">
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupForm />
    </Suspense>
  );
}
