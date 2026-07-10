import { format } from "date-fns";
import type { CourseReview } from "@/types/database";
import { AddReviewDialog } from "@/components/courses/add-review-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageEmpty } from "@/components/page-states";

function getReviewerDisplay(review: CourseReview) {
  if (review.reviewer_name) return review.reviewer_name;
  if (review.user?.full_name) return review.user.full_name;
  if (review.user?.email) return review.user.email;
  return review.user_id ?? "—";
}

export function ReviewsList({
  reviews,
  courseId,
}: {
  reviews: CourseReview[];
  courseId: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddReviewDialog courseId={courseId} />
      </div>
      {reviews.length === 0 ? (
        <PageEmpty
          title="No reviews yet"
          description="Student reviews will appear here once submitted, or add one manually."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell>{getReviewerDisplay(review)}</TableCell>
                <TableCell>{review.rating}/5</TableCell>
                <TableCell className="max-w-md truncate">
                  {review.review}
                </TableCell>
                <TableCell>
                  {format(new Date(review.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
