import { notFound } from "next/navigation";
import { getPublishedCourseById } from "@/lib/db/courses";
import { getBatchForCourse } from "@/lib/db/batches";
import { getUserPurchaseForCourse } from "@/lib/db/purchases";
import {
  InvalidPaymentLink,
  PaymentAccessError,
  PaymentVerificationView,
} from "@/components/payment/payment-verification-view";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ userId?: string; batchId?: string }>;
}) {
  const { courseId } = await params;
  const { userId: userIdParam, batchId: batchIdParam } = await searchParams;
  const userId = userIdParam?.trim() ?? "";
  const batchId = batchIdParam?.trim() ?? "";

  if (!courseId?.trim() || !UUID_RE.test(courseId)) notFound();
  if (!userId || !UUID_RE.test(userId) || !batchId || !UUID_RE.test(batchId)) {
    return <InvalidPaymentLink courseId={courseId} />;
  }

  let course;
  try {
    course = await getPublishedCourseById(courseId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("42501") ||
      message.includes("permission denied for table courses")
    ) {
      return <PaymentAccessError />;
    }
    throw error;
  }
  if (!course) notFound();

  const batch = await getBatchForCourse(batchId, courseId);
  if (!batch) notFound();

  const existingPurchase = await getUserPurchaseForCourse(
    userId,
    courseId,
    batchId
  );

  return (
    <PaymentVerificationView
      course={course}
      courseId={courseId}
      userId={userId}
      batchId={batchId}
      batchName={batch.name}
      existingPurchase={existingPurchase}
    />
  );
}
