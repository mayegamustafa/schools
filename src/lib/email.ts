import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Transactional email.
 *
 * Configured via SMTP so it works with anything — Gmail, Zoho, Brevo, Mailgun,
 * or a local Mailpit in development. When SMTP is not configured the app does
 * not pretend the mail was sent: `sendEmail` reports `configured: false` and the
 * caller falls back to the support-ticket path.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendResult {
  configured: boolean;
  sent: boolean;
  error?: string;
}

let cachedTransport: Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

function getTransport(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (cachedTransport) return cachedTransport;

  const port = Number(process.env.SMTP_PORT) || 587;

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Implicit TLS on 465; STARTTLS on 587 and 25.
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  return cachedTransport;
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const transport = getTransport();

  if (!transport) {
    return { configured: false, sent: false };
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'SchoolFinder <no-reply@schoolfinder.co.ug>',
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { configured: true, sent: true };
  } catch (error) {
    // Never surface SMTP internals to the caller's response body.
    console.error('[email] send failed:', error);
    return {
      configured: true,
      sent: false,
      error: 'Email could not be delivered',
    };
  }
}

/** Minimal branded wrapper — inline styles, since email clients strip <style>. */
export function emailLayout(heading: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f3ef;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e0db;border-radius:16px;padding:32px;">
    <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#2d3640;">SchoolFinder</p>
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#1a1a1a;">${heading}</h1>
    <div style="font-size:14px;line-height:1.6;color:#4a4a4a;">${bodyHtml}</div>
    ${cta ? `
    <p style="margin:28px 0 0;">
      <a href="${cta.url}" style="display:inline-block;background:#2d3640;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">${cta.label}</a>
    </p>
    <p style="margin:20px 0 0;font-size:12px;color:#9b9b9b;word-break:break-all;">
      Or paste this link into your browser:<br>${cta.url}
    </p>` : ''}
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#9b9b9b;text-align:center;">
    You received this because someone used this address on SchoolFinder.
  </p>
</div>`.trim();
}
