"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackLink({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Link
      href={href}
      onClick={() => router.refresh()}
      className={className}
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );
}
