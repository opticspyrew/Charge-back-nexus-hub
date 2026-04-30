import nodemailer from "nodemailer";
import { logger } from "./logger";

const ADMIN_EMAIL = "Opticspycrew@gmail.com";

// Escape characters that have special meaning in HTML so attacker-controlled
// fields (names, emails, free-form notes, etc.) submitted through public
// endpoints cannot inject markup, fake links, or tracking pixels into the
// admin notification emails we send.
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

export function passwordChangedEmail(params: {
  name: string;
  email: string;
  changedAt: Date;
  method: "reset" | "change";
  supportEmail: string;
}): { subject: string; html: string } {
  const { name, email, changedAt, method, supportEmail } = params;
  const subject = "Your CryptoVault password was changed";
  const methodLabel =
    method === "reset"
      ? "using the email-based password reset flow"
      : "from your account settings";
  const timestamp = changedAt.toUTCString();
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
      <div style="background: #1e3a5f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Password changed</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #111827; margin: 0 0 16px;">Hi ${name || "there"},</p>
        <p style="font-size: 14px; color: #374151; margin: 0 0 16px;">
          The password for your CryptoVault account (<strong>${email}</strong>) was just changed ${methodLabel}.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 130px;">When</td>
            <td style="padding: 8px 0; color: #111827; font-size: 13px;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Account</td>
            <td style="padding: 8px 0; color: #111827; font-size: 13px;">${email}</td>
          </tr>
        </table>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="font-size: 13px; color: #92400e; margin: 0; font-weight: 600;">Didn't make this change?</p>
          <p style="font-size: 13px; color: #78350f; margin: 6px 0 0;">
            If you didn't change your password, your account may be compromised. Contact our support team immediately at
            <a href="mailto:${supportEmail}" style="color: #1e3a5f; font-weight: 600;">${supportEmail}</a>
            so we can help you secure your account.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          This is an automated security notification from CryptoVault. You're receiving it because the password
          on your account was changed.
        </p>
      </div>
    </div>
  `;
  return { subject, html };
}

export function newSignInEmail(params: {
  name: string;
  email: string;
  signedInAt: Date;
  deviceLabel: string;
  ipAddress: string | null;
  region?: string | null;
  activityUrl: string | null;
  changePasswordUrl: string | null;
  supportEmail: string;
}): { subject: string; html: string } {
  const {
    name,
    email,
    signedInAt,
    deviceLabel,
    ipAddress,
    region,
    activityUrl,
    changePasswordUrl,
    supportEmail,
  } = params;
  const subject = "New sign-in to your CryptoVault account";
  const timestamp = signedInAt.toUTCString();
  // We always show an "IP / Region" row so the user can recognize the sign-in.
  // Either field falls back to "Unavailable" when we don't have it (e.g. no
  // geo-IP service configured for region, or X-Forwarded-For absent).
  const ipText = ipAddress || "Unavailable";
  const regionText = region || "Unavailable";
  const ipLine = `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">IP / Region</td><td style="padding: 8px 0; color: #111827; font-size: 13px;">${ipText} &middot; ${regionText}</td></tr>`;
  const activityLink = activityUrl
    ? `<a href="${activityUrl}" style="color: #1e3a5f; font-weight: 600;">recent activity</a>`
    : `<strong>recent activity</strong>`;
  const changeLink = changePasswordUrl
    ? `<a href="${changePasswordUrl}" style="color: #1e3a5f; font-weight: 600;">change your password</a>`
    : `<strong>change your password</strong>`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
      <div style="background: #1e3a5f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New sign-in detected</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <p style="font-size: 14px; color: #111827; margin: 0 0 16px;">Hi ${name || "there"},</p>
        <p style="font-size: 14px; color: #374151; margin: 0 0 16px;">
          We detected a sign-in to your CryptoVault account (<strong>${email}</strong>) from a device or
          location we haven't seen before.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px; width: 130px;">When</td>
            <td style="padding: 8px 0; color: #111827; font-size: 13px;">${timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Device</td>
            <td style="padding: 8px 0; color: #111827; font-size: 13px;">${deviceLabel}</td>
          </tr>
          ${ipLine}
        </table>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="font-size: 13px; color: #92400e; margin: 0; font-weight: 600;">If this wasn't you</p>
          <p style="font-size: 13px; color: #78350f; margin: 6px 0 0;">
            Review your ${activityLink} in the dashboard, ${changeLink} immediately, and contact our support team at
            <a href="mailto:${supportEmail}" style="color: #1e3a5f; font-weight: 600;">${supportEmail}</a>.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #6b7280; margin: 0;">
          This is an automated security notification from CryptoVault. You're receiving it because a new
          device just signed in to your account.
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
  // The subject is plain text (header value), but the name still flows into
  // the HTML body below, so we escape every attacker-controlled field there.
  const subject = `[Action Required] New Client Registration — ${client.name}`;
  const safeName = escapeHtml(client.name);
  const safeEmail = escapeHtml(client.email);
  const safePhone = escapeHtml(client.phone);
  const safeCompany = escapeHtml(client.company);
  const safeCreatedAt = escapeHtml(client.createdAt.toUTCString());
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
      <div style="background: #1e3a5f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Client Registration</h1>
        <p style="color: #93c5fd; margin: 4px 0 0; font-size: 13px;">Approval required</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 130px;">Name</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${safeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${safeEmail}</td></tr>
          ${client.phone ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone</td><td style="padding: 8px 0; color: #111827;">${safePhone}</td></tr>` : ""}
          ${client.company ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Company</td><td style="padding: 8px 0; color: #111827;">${safeCompany}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Registered</td><td style="padding: 8px 0; color: #111827;">${safeCreatedAt}</td></tr>
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
  // Every value below originates from a public, unauthenticated submission
  // form, so escape before interpolating into the HTML body to prevent the
  // attacker from injecting fake links, images, or markup into the trusted
  // admin notification.
  const safeTypeLabel = escapeHtml(typeLabel);
  const safeClientName = escapeHtml(client.name);
  const safeClientEmail = escapeHtml(client.email);
  const safeAmount = escapeHtml(amountStr);
  const safeNotes = escapeHtml(request.notes);
  const safeCreatedAt = escapeHtml(request.createdAt.toUTCString());
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
      <div style="background: #92400e; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">${safeTypeLabel} Request</h1>
        <p style="color: #fcd34d; margin: 4px 0 0; font-size: 13px;">Approval required</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 130px;">Client</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${safeClientName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 0; color: #111827;">${safeClientEmail}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Request Type</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${safeTypeLabel}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount</td><td style="padding: 8px 0; font-weight: 700; color: #111827; font-size: 16px;">${safeAmount}</td></tr>
          ${request.notes ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Notes</td><td style="padding: 8px 0; color: #111827;">${safeNotes}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Submitted</td><td style="padding: 8px 0; color: #111827;">${safeCreatedAt}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 14px; color: #374151; margin: 0 0 12px;">Log in to the admin dashboard to <strong>Approve</strong> or <strong>Deny</strong> this request.</p>
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">This is an automated notification from your Firm Admin System.</p>
      </div>
    </div>
  `;
  return { subject, html };
}
