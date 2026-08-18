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
      <Dialog open={open} onOpenChange={setOpen} className="max-w-2xl">
        <DialogContent
          className="flex w-full max-h-[min(40rem,85vh)] flex-col overflow-hidden p-0"
          onClose={() => setOpen(false)}
        >
          <div className="shrink-0 border-b border-brand/15 brand-gradient px-6 py-5 pr-12 sm:px-7">
            <DialogHeader className="mb-0">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-8 w-1 shrink-0 rounded-full brand-accent-bar" />
                <div>
                  <DialogTitle className="text-xl">Add Review</DialogTitle>
                  <p className="mt-1 text-sm text-brand/70">
                    Add a course review with rating and date
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="brand-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  className="w-full"
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
            </div>
            <div>
              <Label>Review</Label>
              <Textarea
                placeholder="Write the review text..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                className="min-h-[7rem] resize-none"
              />
            </div>
            <div className="max-w-xs">
              <Label>Date</Label>
              <Input
                type="date"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex shrink-0 justify-end border-t border-brand/15 bg-surface px-6 py-4 sm:px-7">
            <Button
              className="min-w-40"
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


