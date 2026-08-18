"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Save, Settings2, Users } from "lucide-react";
import { toast } from "sonner";
import type { BatchStatus, CourseBatch } from "@/types/database";
import { updateBatchAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/layout/page-header";

type BatchFormValues = {
  name: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  status: BatchStatus;
  max_seats: string;
};

function toFormValues(batch: CourseBatch): BatchFormValues {
  return {
    name: batch.name,
    start_date: batch.start_date?.slice(0, 16) ?? "",
    end_date: batch.end_date?.slice(0, 16) ?? "",
    registration_deadline: batch.registration_deadline?.slice(0, 16) ?? "",
    status: batch.status,
    max_seats: batch.max_seats != null ? String(batch.max_seats) : "",
  };
}

function toBatchPayload(values: BatchFormValues) {
  return {
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

export function BatchSettingsForm({ batch }: { batch: CourseBatch }) {
  const [values, setValues] = useState<BatchFormValues>(() => toFormValues(batch));
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Card className="overflow-hidden border-brand/20 shadow-sm">
      <SectionHeader
        title="Batch settings"
        description="Update schedule, capacity, and availability for this batch."
      />
      <CardContent className="p-5 sm:p-6">
        <form
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await updateBatchAction(batch.id, toBatchPayload(values));
              toast.success("Batch updated");
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to update");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
              <Settings2 className="h-3.5 w-3.5" />
              General
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Batch name</Label>
                <Input
                  value={values.name}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                  placeholder="e.g. Batch — Jan 2026"
                  required
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

          <div className="space-y-4 border-t border-brand/15 pt-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Start date</Label>
                <Input
                  type="datetime-local"
                  value={values.start_date}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, start_date: e.target.value }))
                  }
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
              <div>
                <Label>Registration deadline</Label>
                <Input
                  type="datetime-local"
                  value={values.registration_deadline}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      registration_deadline: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Max seats</Label>
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand/45" />
                  <Input
                    type="number"
                    min={1}
                    className="pl-9"
                    value={values.max_seats}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, max_seats: e.target.value }))
                    }
                    placeholder="Unlimited"
                  />
                </div>
                <p className="mt-1.5 text-xs text-brand/60">
                  Leave empty for unlimited seats.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-brand/15 pt-5">
            <Button type="submit" disabled={loading || !values.name.trim()} className="min-w-40">
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Batch Settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
