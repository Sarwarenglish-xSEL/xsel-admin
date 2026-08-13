import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CourseEmailPayload = {
  title: string;
  description: string;
  price: number;
  category: string;
  course_type: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!user || !pass || !from) return null;

  return { host, port, user, pass, from };
}

async function getAllAccountEmails(): Promise<string[]> {
  const service = createServiceClient();
  const supabase = service ?? (await createClient());
  const { data, error } = await supabase.from("profiles").select("email");
  if (error) throw error;

  const emails = (data ?? [])
    .map((row) => row.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));

  return [...new Set(emails)];
}

function formatPrice(price: number) {
  if (price <= 0) return "Free";
  return `PKR ${price.toLocaleString("en-PK")}`;
}

function buildCoursePublishedHtml(course: CourseEmailPayload) {
  const safeTitle = course.title.replace(/</g, "&lt;");
  const safeDescription = course.description
    .replace(/</g, "&lt;")
    .slice(0, 400);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">New course published on XSEL</h2>
      <p style="margin: 0 0 16px;">A new course is now available:</p>
      <p style="margin: 0 0 8px;"><strong>${safeTitle}</strong></p>
      <p style="margin: 0 0 8px;">${safeDescription}</p>
      <p style="margin: 0 0 8px;">Type: ${course.course_type} · Category: ${course.category}</p>
      <p style="margin: 0 0 16px;">Price: ${formatPrice(course.price)}</p>
      <p style="margin: 0; color: #555;">Open the XSEL app to explore and enroll.</p>
    </div>
  `.trim();
}

/** Sends a publish notification to every profile email via Gmail SMTP. */
export async function notifyUsersCoursePublished(
  course: CourseEmailPayload
): Promise<{ sent: number; skipped: boolean; error?: string }> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    console.warn(
      "[email] SMTP not configured. Set SMTP_USER and SMTP_PASS (same Gmail App Password as Supabase Auth SMTP)."
    );
    return { sent: 0, skipped: true, error: "SMTP not configured" };
  }

  let recipients: string[];
  try {
    recipients = await getAllAccountEmails();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load users";
    console.error("[email] Failed to load recipients:", message);
    return { sent: 0, skipped: false, error: message };
  }

  if (recipients.length === 0) {
    return { sent: 0, skipped: false };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const subject = `New course: ${course.title}`;
  const html = buildCoursePublishedHtml(course);
  const text = [
    "New course published on XSEL",
    "",
    course.title,
    course.description.slice(0, 400),
    `Type: ${course.course_type} · Category: ${course.category}`,
    `Price: ${formatPrice(course.price)}`,
    "",
    "Open the XSEL app to explore and enroll.",
  ].join("\n");

  // Gmail caps recipients per message; send in BCC chunks.
  const chunkSize = 80;
  let sent = 0;

  try {
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      await transporter.sendMail({
        from: smtp.from,
        to: smtp.from,
        bcc: chunk,
        subject,
        text,
        html,
      });
      sent += chunk.length;
    }
    return { sent, skipped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[email] Course publish notification failed:", message);
    return { sent, skipped: false, error: message };
  }
}
