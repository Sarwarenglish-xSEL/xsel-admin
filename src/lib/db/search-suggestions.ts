import { getAdminDataClient } from "@/lib/db/admin-client";

export type SearchSuggestion = {
  value: string;
  label: string;
  detail?: string;
};

export type SearchSuggestScope = "users" | "enrollments" | "submissions" | "sessions";

const LIMIT = 8;

function uniqueByValue(items: SearchSuggestion[]): SearchSuggestion[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getSearchSuggestions(
  scope: SearchSuggestScope,
  search: string
): Promise<SearchSuggestion[]> {
  const q = search.trim();
  if (q.length < 1) return [];

  const supabase = await getAdminDataClient();
  const term = `%${q}%`;

  if (scope === "users") {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, full_name")
      .neq("role", "superadmin")
      .or(`email.ilike.${term},full_name.ilike.${term}`)
      .order("full_name")
      .limit(LIMIT);
    if (error) throw error;

    return uniqueByValue(
      (data ?? []).map((row) => ({
        value: row.full_name?.trim() || row.email,
        label: row.full_name?.trim() || row.email,
        detail: row.full_name?.trim() ? row.email : undefined,
      }))
    );
  }

  if (scope === "sessions") {
    const { data, error } = await supabase
      .from("profiles")
      .select("email, full_name")
      .or(`email.ilike.${term},full_name.ilike.${term}`)
      .order("full_name")
      .limit(LIMIT);
    if (error) throw error;

    return uniqueByValue(
      (data ?? []).map((row) => ({
        value: row.full_name?.trim() || row.email,
        label: row.full_name?.trim() || row.email,
        detail: row.full_name?.trim() ? row.email : undefined,
      }))
    );
  }

  if (scope === "enrollments") {
    const [users, courses, batches] = await Promise.all([
      supabase
        .from("profiles")
        .select("email, full_name")
        .neq("role", "superadmin")
        .or(`email.ilike.${term},full_name.ilike.${term}`)
        .limit(LIMIT),
      supabase
        .from("courses")
        .select("title")
        .ilike("title", term)
        .limit(LIMIT),
      supabase
        .from("course_batches")
        .select("name")
        .ilike("name", term)
        .limit(LIMIT),
    ]);

    if (users.error) throw users.error;
    if (courses.error) throw courses.error;
    if (batches.error) throw batches.error;

    return uniqueByValue([
      ...(users.data ?? []).map((row) => ({
        value: row.full_name?.trim() || row.email,
        label: row.full_name?.trim() || row.email,
        detail: row.full_name?.trim()
          ? `Student · ${row.email}`
          : "Student",
      })),
      ...(courses.data ?? []).map((row) => ({
        value: row.title,
        label: row.title,
        detail: "Course",
      })),
      ...(batches.data ?? []).map((row) => ({
        value: row.name,
        label: row.name,
        detail: "Batch",
      })),
    ]).slice(0, LIMIT);
  }

  const [users, assignments, quizzes] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name")
      .neq("role", "superadmin")
      .or(`email.ilike.${term},full_name.ilike.${term}`)
      .limit(LIMIT),
    supabase
      .from("assignments")
      .select("title")
      .ilike("title", term)
      .limit(LIMIT),
    supabase
      .from("quizzes")
      .select("title")
      .ilike("title", term)
      .limit(LIMIT),
  ]);

  if (users.error) throw users.error;
  if (assignments.error) throw assignments.error;
  if (quizzes.error) throw quizzes.error;

  return uniqueByValue([
    ...(users.data ?? []).map((row) => ({
      value: row.full_name?.trim() || row.email,
      label: row.full_name?.trim() || row.email,
      detail: row.full_name?.trim()
        ? `Student · ${row.email}`
        : "Student",
    })),
    ...(assignments.data ?? []).map((row) => ({
      value: row.title,
      label: row.title,
      detail: "Assignment",
    })),
    ...(quizzes.data ?? []).map((row) => ({
      value: row.title,
      label: row.title,
      detail: "Quiz",
    })),
  ]).slice(0, LIMIT);
}
