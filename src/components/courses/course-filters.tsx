"use client";

import { Filter } from "lucide-react";
import { Select } from "@/components/ui/select";

export function CourseFilters({
  courseType,
  status,
  category,
}: {
  courseType?: string;
  status?: string;
  category?: string;
}) {
  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value === "all") params.delete(key);
    else params.set(key, value);
    window.location.search = params.toString();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/10 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <Filter className="h-3.5 w-3.5 text-brand" />
        Filters
      </div>
      <Select
        className="w-40"
        defaultValue={courseType ?? "all"}
        onChange={(e) => updateParam("type", e.target.value)}
      >
        <option value="all">All types</option>
        <option value="prerecorded">Pre-recorded</option>
        <option value="live">Live</option>
      </Select>
      <Select
        className="w-40"
        defaultValue={status ?? "all"}
        onChange={(e) => updateParam("status", e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </Select>
      <Select
        className="w-40"
        defaultValue={category ?? "all"}
        onChange={(e) => updateParam("category", e.target.value)}
      >
        <option value="all">All categories</option>
        <option value="design">Design</option>
        <option value="coding">Coding</option>
        <option value="business">Business</option>
      </Select>
    </div>
  );
}
