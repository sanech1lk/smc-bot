import nodemailer from "nodemailer";

/**
 * Email delivery is optional: when SMTP isn't configured (typical in local
 * development) messages are logged to the server console instead, so flows
 * like password reset stay fully testable without a mail provider.
 */
function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || "Kelma <no-reply@kelma.dev>";

  if (!transport) {
    console.info(
      [
        "",
        "─".repeat(70),
        "SMTP не настроен — письмо не отправлено, содержимое ниже:",
        `  Кому:  ${message.to}`,
        `  Тема:  ${message.subject}`,
        "",
        message.text,
        "─".repeat(70),
        ""
      ].join("\n")
    );
    return;
  }

  await transport.sendMail({ from, ...message });
}

export function appUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
