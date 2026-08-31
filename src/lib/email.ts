import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;

  if (!user || !pass || !from) return null;

  return { host, port, user, pass, from };
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    return {
      ok: false,
      message: "Email is not configured. Set SMTP_USER and SMTP_PASS on the server.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const subject = "Reset your XSEL Admin password";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">Reset your password</h2>
      <p style="margin: 0 0 16px;">Click the button below to set a new password for your XSEL Admin account.</p>
      <p style="margin: 0 0 20px;">
        <a href="${resetUrl}" style="display: inline-block; background: #1e3a5f; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="margin: 0 0 8px; color: #555; font-size: 14px;">Or copy this link:</p>
      <p style="margin: 0 0 16px; word-break: break-all; font-size: 13px; color: #333;">${resetUrl}</p>
      <p style="margin: 0; color: #888; font-size: 12px;">If you did not request this, you can ignore this email.</p>
    </div>
  `.trim();

  const text = [
    "Reset your XSEL Admin password",
    "",
    "Open this link to set a new password:",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: email,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[email] Password reset failed:", message);
    return { ok: false, message };
  }
}
