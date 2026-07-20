import { format } from "date-fns";
import { Star } from "lucide-react";
import type { CourseReview } from "@/types/database";
import { AddReviewDialog } from "@/components/courses/add-review-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";
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
    <Card className="overflow-hidden border-brand/10 shadow-sm">
      <SectionHeader
        title="Course reviews"
        description={`${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
        actions={<AddReviewDialog courseId={courseId} />}
      />
      <CardContent className="p-0">
        {reviews.length === 0 ? (
          <div className="p-6">
            <PageEmpty
              title="No reviews yet"
              description="Student reviews will appear here once submitted, or add one manually."
            />
          </div>
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
                  <TableCell className="font-medium text-gray-900">
                    {getReviewerDisplay(review)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-medium text-brand">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {review.rating}/5
                    </span>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-gray-600">
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
      </CardContent>
    </Card>
  );
}
