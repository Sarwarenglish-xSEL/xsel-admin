import { format } from "date-fns";
import type { CourseReview } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageEmpty } from "@/components/page-states";

export function ReviewsList({ reviews }: { reviews: CourseReview[] }) {
  if (reviews.length === 0) {
    return (
      <PageEmpty
        title="No reviews yet"
        description="Student reviews will appear here once submitted."
      />
    );
  }

  return (
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
            <TableCell>
              {(review as CourseReview & { user?: { email: string } }).user
                ?.email ?? review.user_id}
            </TableCell>
            <TableCell>{review.rating}/5</TableCell>
            <TableCell className="max-w-md truncate">{review.review}</TableCell>
            <TableCell>
              {format(new Date(review.created_at), "MMM d, yyyy")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
