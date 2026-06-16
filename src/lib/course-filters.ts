import type { CourseCategory, CourseStatus, CourseType } from "@/types/database";

export function parseCourseFilters(params: {
  type?: string;
  status?: string;
  category?: string;
}) {
  return {
    course_type:
      params.type && params.type !== "all"
        ? (params.type as CourseType)
        : undefined,
    status:
      params.status && params.status !== "all"
        ? (params.status as CourseStatus)
        : undefined,
    category:
      params.category && params.category !== "all"
        ? (params.category as CourseCategory)
        : undefined,
  };
}
