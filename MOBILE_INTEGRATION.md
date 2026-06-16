# Mobile App Integration Guide

This document describes how the Expo mobile app (`../xSEL`) can replace hardcoded `courses.js` data with Supabase queries against the shared database.

## Tables used by mobile

| Feature | Tables |
|---------|--------|
| Course catalog | `courses`, `course_chapters`, `course_lessons` |
| Filters | `courses.category`, `courses.course_type`, `courses.status` |
| Enrollment | `course_enrollments` |
| Purchase flow | `purchases` |
| Progress | `lesson_progress` |
| Quizzes | `quizzes`, `quiz_questions`, `quiz_attempts`, `quiz_answers` |
| Assignments | `assignments`, `assignment_submissions` |
| Reviews | `course_reviews` |
| Certificates | `certificates` |

## Key queries

### Pre-recorded course list (replaces `preRecordedCourses`)

```typescript
const { data } = await supabase
  .from('courses')
  .select('id, title, description, category, price, thumbnail_url, instructor:profiles!courses_instructor_id_fkey(full_name)')
  .eq('course_type', 'prerecorded')
  .eq('status', 'published')
  .order('created_at', { ascending: false });
```

### Live course list (replaces `liveCourses`)

```typescript
const { data } = await supabase
  .from('courses')
  .select('id, title, category, price, thumbnail_url, registration_deadline, instructor:profiles!courses_instructor_id_fkey(full_name)')
  .eq('course_type', 'live')
  .eq('status', 'published')
  .order('registration_deadline');
```

### Filter by category (replaces `categories` filter)

```typescript
let query = supabase
  .from('courses')
  .select('*')
  .eq('status', 'published');

if (category !== 'all') {
  query = query.eq('category', category); // 'design' | 'coding' | 'business'
}
```

### Course detail with chapters & lessons

```typescript
const { data: course } = await supabase
  .from('courses')
  .select(`
    *,
    instructor:profiles!courses_instructor_id_fkey(full_name, avatar_url),
    chapters:course_chapters(
      id, title, sort_order,
      lessons:course_lessons(
        id, title, lesson_type, video_url, duration_seconds,
        live_meeting_url, live_start_time, live_end_time, sort_order, status
      )
    )
  `)
  .eq('id', courseId)
  .eq('status', 'published')
  .single();
```

### My enrolled courses (replaces `myCourses.js`)

```typescript
const { data } = await supabase
  .from('course_enrollments')
  .select(`
    status, created_at,
    course:courses(id, title, thumbnail_url, course_type, category)
  `)
  .eq('user_id', userId)
  .eq('status', 'active');
```

### Submit purchase request (manual approval)

```typescript
await supabase.from('purchases').insert({
  user_id: userId,
  course_id: courseId,
  amount: coursePrice,
  receipt_url: uploadedReceiptUrl, // upload to purchase-receipts bucket
  status: 'pending',
});
```

### Lesson progress

```typescript
await supabase.from('lesson_progress').upsert({
  user_id: userId,
  lesson_id: lessonId,
  watched_seconds: seconds,
  last_position_seconds: position,
  is_completed: completed,
}, { onConflict: 'user_id,lesson_id' });
```

### Course reviews

```typescript
// Average rating for course card
const { data } = await supabase
  .from('course_reviews')
  .select('rating')
  .eq('course_id', courseId);

const avg = data?.length
  ? data.reduce((s, r) => s + r.rating, 0) / data.length
  : 0;
```

## Storage buckets

| Bucket | Mobile usage |
|--------|--------------|
| `course-thumbnails` | Public URLs in course cards |
| `purchase-receipts` | Upload to `{user_id}/{filename}` |
| `assignment-submissions` | Upload to `{user_id}/{filename}` |
| `certificates` | Read own via signed URL or stored `certificate_url` |

## RLS notes

- Published courses/chapters/lessons are readable by everyone (including anonymous).
- Authenticated users read/write their own enrollments, purchases, progress, quiz attempts, and submissions.
- Staff actions (course CRUD, purchase approval) are handled by the admin portal — mobile only needs user-level policies.

## Migration path

1. Apply SQL migrations from `xsel-admin/supabase/migrations/`.
2. Run `npm run seed` in admin portal (or create courses via admin UI).
3. Replace `preRecordedCourses` / `liveCourses` imports with Supabase hooks.
4. Map `Course` fields: `image` → `thumbnail_url`, `instructor` → joined `profiles.full_name`.
5. Keep `getCourseById` as a Supabase fetch + local defaults for outcomes/achievements until those are modeled in DB.

## Field mapping (mock → database)

| Mock (`courses.js`) | Database |
|---------------------|----------|
| `id` | `courses.id` (UUID) |
| `title` / `shortTitle` | `courses.title` |
| `category` | `courses.category` |
| `price` | `courses.price` |
| `image` | `courses.thumbnail_url` |
| `instructor` | `profiles.full_name` via `instructor_id` |
| `deadline` | `courses.registration_deadline` |
| `module` | `course_chapters.title` |
| `lesson` | `course_lessons` (ordered by `sort_order`) |
| `duration` | `course_lessons.duration_seconds` |
