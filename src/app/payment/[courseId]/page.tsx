import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseById } from "@/lib/db/courses";
import { getUserPurchaseForCourse } from "@/lib/db/purchases";
import {
  InvalidPaymentLink,
  PaymentVerificationView,
} from "@/components/payment/payment-verification-view";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { courseId } = await params;
  const { userId: userIdParam } = await searchParams;
  const userId = userIdParam?.trim() ?? "";

  if (!courseId?.trim() || !UUID_RE.test(courseId)) notFound();
  if (!userId || !UUID_RE.test(userId)) {
    return <InvalidPaymentLink courseId={courseId} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const course = await getCourseById(courseId);
  if (!course || course.status !== "published") notFound();

  const sessionUserId = user?.id ?? null;
  const userIdMismatch = !!sessionUserId && sessionUserId !== userId;
  const existingPurchase = await getUserPurchaseForCourse(userId, courseId);

  return (
    <PaymentVerificationView
      course={course}
      courseId={courseId}
      userId={userId}
      userEmail={user?.email ?? null}
      userIdMismatch={userIdMismatch}
      existingPurchase={existingPurchase}
    />
  );
}
