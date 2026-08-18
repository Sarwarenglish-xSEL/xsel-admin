export type UserRole = "superadmin" | "admin" | "manager" | "user";
export type CourseType = "prerecorded" | "live";
export type CourseCategory = "design" | "coding" | "business";
export type CourseStatus = "draft" | "published" | "archived";
export type LessonType = "video" | "live" | "quiz" | "assignment";
export type LessonStatus = "draft" | "published" | "completed";
export type EnrollmentStatus = "active" | "blocked" | "completed";
export type BatchStatus = "upcoming" | "active" | "completed" | "cancelled";
export type PurchaseStatus = "pending" | "approved" | "rejected";
export type QuizOption = "a" | "b" | "c" | "d";
export type QuizType = "lesson" | "video";
export type AssignmentType = "written" | "file";

export interface DeviceTransferRecord {
  device_token?: string | null;
  device_model?: string | null;
  os?: string | null;
  app_version?: string | null;
  transferred_at?: string | null;
  created_at?: string | null;
  from_device_model?: string | null;
  to_device_model?: string | null;
  from_os?: string | null;
  to_os?: string | null;
  [key: string]: unknown;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  allowed_modules: string[];
  created_at: string;
  updated_at: string;
  registered_device_token: string | null;
  registered_device_model: string | null;
  registered_os: string | null;
  registered_app_version: string | null;
  device_transfer_count: number;
  device_transfer_history: DeviceTransferRecord[];
}

export interface UserSession {
  user_id: string;
  session_id: string;
  device_model: string | null;
  os: string | null;
  app_version: string | null;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  user?: Profile | null;
}

export interface LearningOutcome {
  title: string;
  description: string;
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
  course_start_date: string | null;
  fake_enrollments: number;
  learning_outcomes: LearningOutcome[];
  created_at: string;
  updated_at: string;
  instructor?: Profile | null;
}

export interface CourseChapter {
  id: string;
  course_id: string;
  batch_id: string | null;
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
  live_class_status?: string | null;
  created_at: string;
  updated_at: string;
  chapter?: CourseChapter & { course?: Course };
  quizzes?: Pick<Quiz, "id" | "title" | "quiz_type" | "sort_order">[];
  assignments?: Pick<Assignment, "id" | "title" | "type" | "sort_order">[];
}

export interface CourseBatch {
  id: string;
  course_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  status: BatchStatus;
  max_seats: number | null;
  created_at: string;
  updated_at: string;
  course?: Course;
  enrollment_count?: number;
  active_enrollment_count?: number;
}

export interface Purchase {
  id: string;
  user_id: string;
  course_id: string;
  batch_id: string | null;
  amount: number;
  status: PurchaseStatus;
  receipt_url: string | null;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
  user?: Profile;
  course?: Course;
  batch?: CourseBatch;
  is_enrolled?: boolean;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  batch_id: string | null;
  purchase_id: string | null;
  status: EnrollmentStatus;
  progress: number;
  created_at: string;
  user?: Profile;
  course?: Course;
  batch?: CourseBatch;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_marks: number;
  total_marks: number;
  quiz_type: QuizType;
  sort_order: number;
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
  reason: string;
  sort_order: number;
}

export interface Assignment {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  question: string;
  type: AssignmentType;
  max_marks: number;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  file_url: string | null;
  text_answer: string | null;
  obtained_marks: number | null;
  feedback: string | null;
  submitted_at: string;
  user?: Profile;
  assignment?: Assignment & { lesson?: CourseLesson };
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: QuizOption;
  is_correct: boolean;
  question?: QuizQuestion;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  obtained_marks: number;
  is_passed: boolean;
  submitted_at: string;
  user?: Profile;
  quiz?: Quiz & { lesson?: CourseLesson };
  answers?: QuizAnswer[];
}

export interface CourseReview {
  id: string;
  course_id: string;
  user_id: string | null;
  reviewer_name: string | null;
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

export interface DashboardChartData {
  userSignupsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  purchaseTrendByMonth: {
    month: string;
    approved: number;
    pending: number;
    rejected: number;
  }[];
  purchaseStatusCounts: { status: string; count: number }[];
  enrollmentStatusCounts: { status: string; count: number }[];
}
