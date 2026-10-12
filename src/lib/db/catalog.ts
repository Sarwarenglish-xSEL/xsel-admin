import { cache } from "react";
import { getAdminDataClient } from "@/lib/db/admin-client";

export type CourseFilterOption = {
  id: string;
  title: string;
};

export type BatchFilterOption = {
  id: string;
  name: string;
  course_id: string;
  course?: { id: string; title: string } | null;
};

/** Cached per request — id/title only for filter dropdowns. */
export const getCourseFilterOptions = cache(
  async (): Promise<CourseFilterOption[]> => {
    const supabase = await getAdminDataClient();
    const { data, error } = await supabase
      .from("courses")
      .select("id, title")
      .order("title");
    if (error) throw error;
    return data ?? [];
  }
);

/** Cached per request — no enrollment aggregation (faster than full batch overview). */
export const getBatchFilterOptions = cache(
  async (): Promise<BatchFilterOption[]> => {
    const supabase = await getAdminDataClient();
    const { data, error } = await supabase
      .from("course_batches")
      .select("id, name, course_id, course:courses(id, title)")
      .order("name");
    if (error) throw error;
    return (data ?? []) as unknown as BatchFilterOption[];
  }
);
