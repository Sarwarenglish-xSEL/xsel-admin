/**
 * Seed sample courses from mobile app mock data into Supabase.
 *
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 * Requires NEXT_PUBLIC_SUPABASE_URL in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// Inline seed data from mobile courses.js (avoids ESM import issues)
const preRecordedCourses = [
  {
    title: "Mastering Responsive Layout Systems",
    shortTitle: "Advanced UI Design Systems",
    module: "Module 3: Advanced Principles",
    instructor: "Alex Rivera",
    price: 89.99,
    category: "design",
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
  },
  {
    title: "Data Science Fundamentals",
    shortTitle: "Data Science Fundamentals",
    module: "Module 1: Analytics Foundations",
    instructor: "Michael Chen",
    price: 79.99,
    category: "coding",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
  {
    title: "Business Strategy Masterclass",
    shortTitle: "Business Strategy Masterclass",
    module: "Module 2: Strategic Thinking",
    instructor: "Emily Rodriguez",
    price: 69.99,
    category: "business",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  },
  {
    title: "Modern Web Development",
    shortTitle: "Modern Web Development",
    module: "Module 4: Full Stack Delivery",
    instructor: "David Park",
    price: 94.99,
    category: "coding",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
  },
];

const liveCourses = [
  {
    title: "Growth Marketing Masterclass",
    instructor: "Elena Rodriguez",
    price: 149.99,
    category: "business",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  },
  {
    title: "Product Leadership Workshop",
    instructor: "James Wilson",
    price: 129.99,
    category: "business",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
  },
  {
    title: "AI for Designers Live",
    instructor: "Priya Sharma",
    price: 99.99,
    category: "design",
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
  },
];

async function findInstructorId(name: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("full_name", `%${name.split(" ")[0]}%`)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function seedCourse(
  course: (typeof preRecordedCourses)[0] | (typeof liveCourses)[0],
  courseType: "prerecorded" | "live"
) {
  const instructorId = await findInstructorId(course.instructor);

  const { data: created, error } = await supabase
    .from("courses")
    .insert({
      title: "shortTitle" in course ? course.shortTitle : course.title,
      description: `Explore ${course.title} with a professional learning path, practical lessons, and guided progress.`,
      course_type: courseType,
      category: course.category,
      price: course.price,
      thumbnail_url: course.image,
      instructor_id: instructorId,
      status: "published",
      registration_deadline:
        courseType === "live"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null,
    })
    .select()
    .single();

  if (error) {
    console.error(`Failed to create ${course.title}:`, error.message);
    return;
  }

  const moduleTitle =
    "module" in course ? course.module : "Live Session";

  const { data: chapter, error: chError } = await supabase
    .from("course_chapters")
    .insert({
      course_id: created.id,
      title: moduleTitle,
      sort_order: 0,
    })
    .select()
    .single();

  if (chError) {
    console.error(`Failed to create chapter for ${course.title}:`, chError.message);
    return;
  }

  const lessons =
    courseType === "prerecorded"
      ? [
          {
            title: "Introduction",
            lesson_type: "video" as const,
            video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            duration_seconds: 600,
            sort_order: 0,
            status: "published" as const,
          },
          {
            title: "Core Concepts Quiz",
            lesson_type: "quiz" as const,
            sort_order: 1,
            status: "published" as const,
          },
          {
            title: "Practice Assignment",
            lesson_type: "assignment" as const,
            sort_order: 2,
            status: "published" as const,
          },
        ]
      : [
          {
            title: "Live Workshop Session",
            lesson_type: "live" as const,
            live_meeting_url: "https://meet.google.com/abc-defg-hij",
            live_start_time: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            live_end_time: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
            ).toISOString(),
            sort_order: 0,
            status: "published" as const,
          },
        ];

  for (const lesson of lessons) {
    const { data: createdLesson, error: lError } = await supabase
      .from("course_lessons")
      .insert({ chapter_id: chapter.id, ...lesson })
      .select()
      .single();

    if (lError) {
      console.error(`Failed lesson for ${course.title}:`, lError.message);
      continue;
    }

    if (lesson.lesson_type === "quiz") {
      const { data: quiz } = await supabase
        .from("quizzes")
        .insert({
          lesson_id: createdLesson.id,
          title: "Knowledge Check",
          passing_marks: 7,
          total_marks: 10,
        })
        .select()
        .single();

      if (quiz) {
        await supabase.from("quiz_questions").insert({
          quiz_id: quiz.id,
          question: "What is the primary goal of this course?",
          option_a: "Learn fundamentals",
          option_b: "Skip practice",
          option_c: "Avoid projects",
          option_d: "None of the above",
          correct_option: "a",
          sort_order: 0,
        });
      }
    }

    if (lesson.lesson_type === "assignment") {
      await supabase.from("assignments").insert({
        lesson_id: createdLesson.id,
        title: "Practice Exercise",
        description: "Apply what you learned in a hands-on exercise.",
        max_marks: 100,
        due_date: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    }
  }

  console.log(`✓ Seeded: ${created.title}`);
}

async function main() {
  console.log("Seeding XSEL courses...\n");

  for (const course of preRecordedCourses) {
    await seedCourse(course, "prerecorded");
  }

  for (const course of liveCourses) {
    await seedCourse(course, "live");
  }

  console.log("\nDone! Promote an admin with:");
  console.log(
    "  update profiles set role = 'admin' where email = 'your@email.com';"
  );
}

main().catch(console.error);
