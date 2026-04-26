import nodemailer from "nodemailer";
import { logger } from "./logger";

const ADMIN_EMAIL = "Opticspycrew@gmail.com";

function createTransporter() {
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;

  if (!user || !rawPass) {
    return null;
  }

  // Gmail App Passwords are displayed with spaces but must be used without them
  const pass = rawPass.replace(/\s+/g, "");

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });
}

export async function sendAdminEmail(subject: string, html: string): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    logger.warn("Email not configured — SMTP_USER and SMTP_PASS env vars required. Email skipped.");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Firm Admin System" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject,
      html,
    });
    logger.info({ to: ADMIN_EMAIL, subject }, "Admin email sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send admin email");
    return false;
  }
}

export async function sendUserEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    logger.warn(
      { to, subject },
      "Email not configured — SMTP_USER and SMTP_PASS env vars required. Email skipped.",
    );
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"CryptoVault" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, "User email sent");
    return true;
  } catch (err) {
    logger.error({ err, to }, "Failed to send user email");
    return false;
  }
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}): { subject: string; html: string } {
  const { name, resetUrl, expiresInMinutes } = params;
  const subject = "Reset your CryptoVault password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
      <div style="background: #1e3a5f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Reset your password</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #111827; margin: 0 0 16px;">Hi ${name || "there"},</p>
        <p style="font-size: 14px; color: #374151; margin: 0 0 16px;">
          We received a request to reset the password for your CryptoVault account. Click the
          button below to set a new password. This link will expire in ${expiresInMinutes} minutes
          and can only be used once.
        </p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #1e3a5f; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Reset password
          </a>
        </p>
        <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px;">
          If the button doesn't work, copy and paste this URL into your browser:
        </p>
        <p style="font-size: 12px; color: #1e3a5f; word-break: break-all; margin: 0 0 16px;">
          ${resetUrl}
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          If you didn't request a password reset, you can safely ignore this email — your password
          will stay the same.
        </p>
      </div>
    </div>
  `;
  return { subject, html };
}

export function newClientEmail(client: {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  createdAt: Date;
}): { subject: string; html: string } {
  const subject = `[Action Required] New Client Registration — ${client.name}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
      <div style="background: #1e3a5f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Client Registration</h1>
        <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">Approval required</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 130px;">Name</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${client.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${client.email}</td></tr>
          ${client.phone ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone</td><td style="padding: 8px 0; color: #111827;">${client.phone}</td></tr>` : ""}
          ${client.company ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Company</td><td style="padding: 8px 0; color: #111827;">${client.company}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Registered</td><td style="padding: 8px 0; color: #111827;">${client.createdAt.toUTCString()}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 14px; color: #374151; margin: 0 0 12px;">Review this new client registration in the admin dashboard and update their status to <strong>Approved</strong> or <strong>Denied</strong>.</p>
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">This is an automated notification from your Firm Admin System.</p>
      </div>
    </div>
  `;
  return { subject, html };
}

export function newServiceRequestEmail(params: {
  client: { name: string; email: string };
  request: { type: string; amount?: string | null; currency: string; notes?: string | null; createdAt: Date };
}): { subject: string; html: string } {
  const { client, request } = params;
  const typeLabel = request.type.charAt(0).toUpperCase() + request.type.slice(1);
  const subject = `[Action Required] ${typeLabel} Request — ${client.name}`;
  const amountStr = request.amount ? `${request.currency} ${Number(request.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
      <div style="background: #92400e; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">${typeLabel} Request</h1>
        <p style="color: #fcd34d; margin: 4px 0 0; font-size: 13px;">Approval required</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 130px;">Client</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${client.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 0; color: #111827;">${client.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Request Type</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${typeLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td><td style="padding: 8px 0; font-weight: 700; color: #111827; font-size: 16px;">${amountStr}</td></tr>
          ${request.notes ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Notes</td><td style="padding: 8px 0; color: #111827;">${request.notes}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Submitted</td><td style="padding: 8px 0; color: #111827;">${request.createdAt.toUTCString()}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 14px; color: #374151; margin: 0 0 12px;">Log in to the admin dashboard to <strong>Approve</strong> or <strong>Deny</strong> this request.</p>
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">This is an automated notification from your Firm Admin System.</p>
      </div>
    </div>
  `;
  return { subject, html };
}
