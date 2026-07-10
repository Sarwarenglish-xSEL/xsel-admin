"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createCourseReviewAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function AddReviewDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState("5");
  const [review, setReview] = useState("");
  const [createdAt, setCreatedAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function resetForm() {
    setReviewerName("");
    setRating("5");
    setReview("");
    setCreatedAt(format(new Date(), "yyyy-MM-dd"));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const createdAtIso = new Date(`${createdAt}T12:00:00`).toISOString();
      await createCourseReviewAction({
        course_id: courseId,
        reviewer_name: reviewerName,
        rating: Number(rating),
        review,
        created_at: createdAtIso,
      });
      toast.success("Review added");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Review
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reviewer name</Label>
              <Input
                placeholder="e.g. John Doe"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>
            <div>
              <Label>Rating</Label>
              <Select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </Select>
            </div>
            <div>
              <Label>Review</Label>
              <Textarea
                placeholder="Write the review text..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={loading || !reviewerName.trim() || !review.trim() || !createdAt}
              onClick={handleSubmit}
            >
              {loading ? "Adding..." : "Add Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
