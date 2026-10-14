import { createClient } from "@/lib/supabase/server";
import { removeStorageObject } from "@/lib/db/storage-cleanup";
import type { LessonAttachment, LessonAttachmentFileType } from "@/types/database";

const LESSON_ATTACHMENTS_BUCKET = "lesson-attachments";

export type LessonAttachmentInput = {
  title?: string;
  file_name: string;
  file_url: string;
  file_type: LessonAttachmentFileType;
  mime_type: string;
  file_size_bytes?: number | null;
  sort_order?: number;
  instructions?: string;
};

export async function getAttachmentsByLessonId(
  lessonId: string
): Promise<LessonAttachment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_attachments")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function createAttachment(
  lessonId: string,
  input: LessonAttachmentInput
): Promise<LessonAttachment> {
  const supabase = await createClient();
  const sortOrder =
    input.sort_order ?? (await nextAttachmentSortOrder(lessonId));

  const { data, error } = await supabase
    .from("lesson_attachments")
    .insert({
      lesson_id: lessonId,
      title: input.title?.trim() || input.file_name,
      file_name: input.file_name,
      file_url: input.file_url,
      file_type: input.file_type,
      mime_type: input.mime_type,
      file_size_bytes: input.file_size_bytes ?? null,
      sort_order: sortOrder,
      instructions: input.instructions?.trim() ?? "",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAttachment(
  id: string,
  input: Partial<LessonAttachmentInput>
): Promise<LessonAttachment> {
  const supabase = await createClient();

  let previousFileUrl: string | null = null;
  if (input.file_url) {
    const { data: existing, error: fetchError } = await supabase
      .from("lesson_attachments")
      .select("file_url")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    previousFileUrl = existing?.file_url ?? null;
  }

  const { data, error } = await supabase
    .from("lesson_attachments")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (
    previousFileUrl &&
    input.file_url &&
    previousFileUrl !== input.file_url
  ) {
    await removeStorageObject(LESSON_ATTACHMENTS_BUCKET, previousFileUrl);
  }

  return data;
}

export async function deleteAttachment(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error: fetchError } = await supabase
    .from("lesson_attachments")
    .select("id, file_url")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!data) throw new Error("Attachment not found");

  await removeStorageObject(LESSON_ATTACHMENTS_BUCKET, data.file_url);

  const { error } = await supabase
    .from("lesson_attachments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

async function nextAttachmentSortOrder(lessonId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_attachments")
    .select("sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.sort_order ?? -1) + 1;
}
