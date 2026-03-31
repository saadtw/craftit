import { Resend } from "resend";

const fromEmail =
  process.env.RESEND_FROM_EMAIL || "Craftit <no-reply@example.com>";
const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 10000);
const EMAIL_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.EMAIL_MAX_ATTEMPTS || 3),
);
const EMAIL_RETRY_BASE_MS = Number(process.env.EMAIL_RETRY_BASE_MS || 300);
const MAX_BACKOFF_MS = 5000;

class EmailTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "EmailTimeoutError";
  }
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function buildAppUrl(path) {
  const origin =
    process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new EmailTimeoutError(`${label} timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);
    }),
  ]).finally(() => {
    clearTimeout(timer);
  });
}

function toStatusCode(error) {
  return (
    error?.statusCode ||
    error?.status ||
    error?.response?.status ||
    error?.error?.statusCode ||
    error?.error?.status
  );
}

function toErrorCode(error) {
  return error?.code || error?.error?.code;
}

function isRetryableEmailError(error) {
  if (!error) {
    return false;
  }

  if (error instanceof EmailTimeoutError) {
    return true;
  }

  const status = Number(toStatusCode(error));
  if (status === 429 || status >= 500) {
    return true;
  }

  const code = (toErrorCode(error) || "").toUpperCase();
  if (
    [
      "ECONNRESET",
      "ETIMEDOUT",
      "EAI_AGAIN",
      "ENOTFOUND",
      "ECONNREFUSED",
    ].includes(code)
  ) {
    return true;
  }

  return false;
}

function calculateBackoffMs(attempt) {
  const expo = Math.min(
    MAX_BACKOFF_MS,
    EMAIL_RETRY_BASE_MS * 2 ** (attempt - 1),
  );
  const jitter = Math.floor(Math.random() * Math.max(50, EMAIL_RETRY_BASE_MS));
  return expo + jitter;
}

async function sendWithRetry(sendFn, metadata) {
  let lastError;

  for (let attempt = 1; attempt <= EMAIL_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withTimeout(
        sendFn(),
        EMAIL_TIMEOUT_MS,
        "Resend email request",
      );
    } catch (error) {
      lastError = error;

      const canRetry =
        attempt < EMAIL_MAX_ATTEMPTS && isRetryableEmailError(error);
      if (!canRetry) {
        break;
      }

      const delayMs = calculateBackoffMs(attempt);
      console.warn("Email send failed. Retrying.", {
        ...metadata,
        attempt,
        nextRetryInMs: delayMs,
        error: error?.message,
      });
      await wait(delayMs);
    }
  }

  throw lastError;
}

function normalizeResendError(error, metadata) {
  if (error instanceof Error) {
    return error;
  }

  const status = toStatusCode(error);
  const message =
    error?.message ||
    error?.name ||
    `Resend email request failed${status ? ` (status ${status})` : ""}`;

  const normalized = new Error(message);
  normalized.name = "ResendEmailError";
  normalized.statusCode = status;
  normalized.code = toErrorCode(error);
  normalized.metadata = metadata;
  return normalized;
}

async function sendHtmlEmail({ to, subject, html, text }) {
  const resend = getResendClient();

  if (!resend) {
    console.warn("RESEND_API_KEY missing. Email not sent.", { to, subject });
    return { skipped: true };
  }

  const payload = {
    from: fromEmail,
    to,
    subject,
    html,
    text,
  };

  const result = await sendWithRetry(() => resend.emails.send(payload), {
    to,
    subject,
  });

  if (result?.error) {
    throw normalizeResendError(result.error, { to, subject });
  }

  return { skipped: false, id: result?.data?.id };
}

function wrapTemplate({ title, intro, ctaLabel, ctaUrl, footer }) {
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style=\"margin:24px 0\"><a href=\"${ctaUrl}\" style=\"background:#1d4ed8;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700\">${ctaLabel}</a></p>`
      : "";

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 12px">${title}</h2>
    <p style="margin:0 0 12px">${intro}</p>
    ${ctaBlock}
    <p style="font-size:12px;color:#6b7280;margin-top:24px">${footer || "If you did not request this, you can ignore this email."}</p>
  </div>`;
}

export async function sendVerificationEmail({ to, name, token }) {
  const url = buildAppUrl(`/auth/verify-email?token=${token}`);
  const subject = "Verify your Craftit email";
  const intro = `Hi ${name || "there"}, please verify your email to activate your Craftit account.`;
  const html = wrapTemplate({
    title: "Verify your email",
    intro,
    ctaLabel: "Verify email",
    ctaUrl: url,
    footer: "This verification link expires in 24 hours.",
  });

  return sendHtmlEmail({
    to,
    subject,
    html,
    text: `${intro}\n\nVerify: ${url}`,
  });
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const url = buildAppUrl(`/auth/reset-password/${token}`);
  const subject = "Reset your Craftit password";
  const intro = `Hi ${name || "there"}, we received a request to reset your password.`;
  const html = wrapTemplate({
    title: "Reset password",
    intro,
    ctaLabel: "Reset password",
    ctaUrl: url,
    footer: "This password reset link expires in 30 minutes.",
  });

  return sendHtmlEmail({
    to,
    subject,
    html,
    text: `${intro}\n\nReset link: ${url}`,
  });
}

export async function sendTwoFactorCodeEmail({ to, name, code }) {
  const subject = "Your Craftit sign-in code";
  const intro = `Hi ${name || "there"}, your verification code is ${code}.`;
  const html = wrapTemplate({
    title: "Two-factor code",
    intro: `${intro} It expires in 10 minutes.`,
    footer: "If you did not try to sign in, change your password immediately.",
  });

  return sendHtmlEmail({
    to,
    subject,
    html,
    text: `${intro} It expires in 10 minutes.`,
  });
}

export async function sendTransactionalNotificationEmail({
  to,
  subject,
  title,
  message,
  link,
}) {
  const html = wrapTemplate({
    title,
    intro: message,
    ctaLabel: link ? "View details" : undefined,
    ctaUrl: link ? buildAppUrl(link) : undefined,
  });

  return sendHtmlEmail({ to, subject, html, text: `${title}\n\n${message}` });
}
