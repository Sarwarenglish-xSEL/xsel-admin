"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { BatchStatus, Course } from "@/types/database";
import { createBatchAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type BatchFormValues = {
  course_id: string;
  name: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  status: BatchStatus;
  max_seats: string;
};

const emptyForm: BatchFormValues = {
  course_id: "",
  name: "",
  start_date: "",
  end_date: "",
  registration_deadline: "",
  status: "upcoming",
  max_seats: "",
};

function toBatchPayload(values: BatchFormValues) {
  return {
    course_id: values.course_id,
    name: values.name.trim(),
    start_date: values.start_date ? new Date(values.start_date).toISOString() : null,
    end_date: values.end_date ? new Date(values.end_date).toISOString() : null,
    registration_deadline: values.registration_deadline
      ? new Date(values.registration_deadline).toISOString()
      : null,
    status: values.status,
    max_seats: values.max_seats ? Number(values.max_seats) : null,
  };
}

export function CreateBatchDialog({ courses }: { courses: Course[] }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<BatchFormValues>(emptyForm);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Batch
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
                  <DialogTitle className="text-xl">Create New Batch</DialogTitle>
                  <p className="mt-1 text-sm text-brand/70">
                    Add a cohort with its own schedule and seat limit
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!values.course_id) {
                toast.error("Select a course");
                return;
              }
              setLoading(true);
              try {
                const batch = await createBatchAction(toBatchPayload(values));
                toast.success("Batch created");
                setOpen(false);
                setValues(emptyForm);
                router.push(`/batches/${batch.id}/edit`);
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to create batch");
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="brand-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Course</Label>
                  <Select
                    className="w-full"
                    value={values.course_id}
                    onChange={(e) => setValues((v) => ({ ...v, course_id: e.target.value }))}
                    required
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Batch name</Label>
                  <Input
                    value={values.name}
                    onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                    placeholder="e.g. Batch — Jan 2026"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="datetime-local"
                    value={values.start_date}
                    onChange={(e) => setValues((v) => ({ ...v, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input
                    type="datetime-local"
                    value={values.end_date}
                    onChange={(e) => setValues((v) => ({ ...v, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Registration deadline</Label>
                  <Input
                    type="datetime-local"
                    value={values.registration_deadline}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, registration_deadline: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Max seats</Label>
                  <Input
                    type="number"
                    min={1}
                    value={values.max_seats}
                    onChange={(e) => setValues((v) => ({ ...v, max_seats: e.target.value }))}
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    className="w-full"
                    value={values.status}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, status: e.target.value as BatchStatus }))
                    }
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end border-t border-brand/15 bg-white px-6 py-4 sm:px-7">
              <Button
                type="submit"
                className="min-w-40"
                disabled={loading || !values.name.trim() || !values.course_id}
              >
                {loading ? "Creating..." : "Create Batch"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
