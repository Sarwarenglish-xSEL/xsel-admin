import { Suspense } from "react";
import SignupForm from "./signup-form";

export default function Signup() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
