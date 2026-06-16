export type UserRole = "admin" | "manager" | "user";
export type CourseType = "prerecorded" | "live";
export type CourseCategory = "design" | "coding" | "business";
export type CourseStatus = "draft" | "published" | "archived";
export type LessonType = "video" | "live" | "quiz" | "assignment";
export type LessonStatus = "draft" | "published";
export type EnrollmentStatus = "active" | "completed" | "revoked";
export type PurchaseStatus = "pending" | "approved" | "rejected";
export type QuizOption = "a" | "b" | "c" | "d";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  course_type: CourseType;
  category: CourseCategory;
  price: number;
  thumbnail_url: string | null;
  instructor_id: string | null;
  status: CourseStatus;
  registration_deadline: string | null;
  created_at: string;
  updated_at: string;
  instructor?: Profile | null;
}

export interface CourseChapter {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  chapter_id: string;
  title: string;
  lesson_type: LessonType;
  video_url: string | null;
  live_meeting_url: string | null;
  live_start_time: string | null;
  live_end_time: string | null;
  duration_seconds: number | null;
  sort_order: number;
  status: LessonStatus;
  created_at: string;
  updated_at: string;
  chapter?: CourseChapter & { course?: Course };
}

export interface Purchase {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  status: PurchaseStatus;
  receipt_url: string | null;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
  user?: Profile;
  course?: Course;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  purchase_id: string | null;
  status: EnrollmentStatus;
  created_at: string;
  user?: Profile;
  course?: Course;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_marks: number;
  total_marks: number;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: QuizOption;
  sort_order: number;
}

export interface Assignment {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  max_marks: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  file_url: string;
  obtained_marks: number | null;
  feedback: string | null;
  submitted_at: string;
  user?: Profile;
  assignment?: Assignment & { lesson?: CourseLesson };
}

export interface CourseReview {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  review: string;
  created_at: string;
  user?: Profile;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_url: string;
  issued_at: string;
  user?: Profile;
  course?: Course;
}

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  pendingPurchases: number;
  upcomingLiveLessons: number;
}
