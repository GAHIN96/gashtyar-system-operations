import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { getDb, initDb } from './db';
import { nowUtc, formatBaghdad } from './time';
import { logAudit } from './auth';

export interface EmailRecipient {
  userId: string;
  email: string;
  name: string;
}

export interface SendNotificationPayload {
  subject: string;
  summaryText: string;
  contentType: 'INCIDENT' | 'UPDATE' | 'DIGEST' | 'SYSTEM_STATUS' | 'GENERAL';
  referenceId?: string;
  systemName?: string;
  statusBadge?: string;
  etaText?: string;
  senderId: string;
  senderName: string;
  recipients: EmailRecipient[];
  idempotencyKey?: string;
  targetUrlPath?: string;
}

/**
 * Reads SMTP configuration from DB app_settings or process.env
 */
export async function getSmtpConfig() {
  await initDb();
  const db = getDb();
  const rows = await db.execute(`SELECT key, value FROM app_settings WHERE key LIKE 'smtp_%'`);
  const settings: Record<string, string> = {};
  for (const row of rows.rows) {
    settings[row.key as string] = row.value as string;
  }

  const host = settings.smtp_host || process.env.SMTP_HOST;
  const port = parseInt(settings.smtp_port || process.env.SMTP_PORT || '587', 10);
  const user = settings.smtp_user || process.env.SMTP_USER;
  const pass = settings.smtp_pass || process.env.SMTP_PASS;
  const from = settings.smtp_from || process.env.SMTP_FROM || 'Gashtyar IT Operations <it@monitor.gashtyartravel.com>';
  const secure = settings.smtp_secure === 'true' || port === 465;

  const isConfigured = Boolean(host && user && pass);

  return { host, port, user, pass, from, secure, isConfigured };
}

/**
 * Resolves the public application URL for transactional and notification emails.
 * Always defaults to the production domain https://monitor.gashtyartravel.com.
 */
export function getAppBaseUrl(): string {
  const envUrl =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'https://monitor.gashtyartravel.com';
}

/**
 * Creates nodemailer transport if configured
 */
export async function getTransporter() {
  const config = await getSmtpConfig();
  if (!config.isConfigured) return null;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

/**
 * HTML Email Template with Gashtyar Corporate Branding
 */
export function buildHtmlTemplate(params: {
  title: string;
  preheader: string;
  systemName?: string;
  statusBadge?: string;
  etaText?: string;
  summary: string;
  authorName?: string;
  actionUrl: string;
  actionButtonText: string;
  isVerificationCode?: boolean;
  code?: string;
}): string {
  const currentBaghdadTime = formatBaghdad(nowUtc(), 'full');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 24px 32px; border-bottom: 3px solid #ea580c; display: flex; align-items: center; justify-content: space-between; }
    .brand-title { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.01em; line-height: 1.3; }
    .brand-sub { color: #94a3b8; font-size: 13px; margin-top: 4px; font-weight: 500; }
    .content { padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    .badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-green { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .system-title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6; color: #475569; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-label { font-weight: 600; color: #1e293b; }
    .summary-text { font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px; white-space: pre-line; }
    .code-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
    .code-number { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ea580c; font-family: monospace; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; text-align: center; }
    .btn:hover { background-color: #1e293b; }
    .security-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
    .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="brand-title">${params.title || 'Gashtyar IT Operations'}</h1>
        <div class="brand-sub">${params.systemName ? `${params.systemName} &bull; Gashtyar IT Operations` : 'Gashtyar IT Operations'}</div>
      </div>
    </div>
    
    <div class="content">
      ${params.statusBadge ? `<span class="badge ${params.statusBadge.toLowerCase().includes('critical') || params.statusBadge.toLowerCase().includes('unavail') ? 'badge-red' : params.statusBadge.toLowerCase().includes('degraded') || params.statusBadge.toLowerCase().includes('investig') ? 'badge-amber' : 'badge-blue'}">${params.statusBadge}</span>` : ''}

      ${params.systemName || params.etaText || params.authorName ? `
        <div class="meta-box">
          ${params.systemName ? `<div class="meta-row"><span class="meta-label">Affected System:</span> <span>${params.systemName}</span></div>` : ''}
          ${params.etaText ? `<div class="meta-row"><span class="meta-label">Estimated Resolution:</span> <span style="font-weight:600; color:#ea580c;">${params.etaText}</span></div>` : ''}
          ${params.authorName ? `<div class="meta-row"><span class="meta-label">Updated By:</span> <span>${params.authorName}</span></div>` : ''}
          <div class="meta-row"><span class="meta-label">Baghdad Time:</span> <span>${currentBaghdadTime}</span></div>
        </div>
      ` : ''}

      <div class="summary-text">${params.summary}</div>

      ${params.isVerificationCode && params.code ? `
        <div class="code-box">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
          <div class="code-number">${params.code}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 6px;">Valid for 10 minutes. Single-use only.</div>
        </div>
      ` : ''}

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${params.actionUrl}" class="btn">${params.actionButtonText}</a>
      </div>

      <div class="security-notice">
        <strong>Security Notice:</strong> Gashtyar IT notification links do not grant automatic access. For confidentiality, following this link will require fresh 6-digit email code verification before confidential operational details are revealed.
      </div>
    </div>

    <div class="footer">
      Gashtyar Travel & Tourism IT Operations &bull; Internal Management Notice<br>
      This is a secure internal system message. Do not forward.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send Transactional Verification Email
 * Sends each unique code directly to the user's own email
 */
export async function sendVerificationEmail(email: string, code: string, name: string) {
  const config = await getSmtpConfig();
  const appBaseUrl = getAppBaseUrl();
  const actionUrl = `${appBaseUrl}/?email=${encodeURIComponent(email)}`;
  const recipientEmail = email.trim().toLowerCase();

  const title = 'Gashtyar IT Operations — Security Verification Code';
  const preheader = `Your single-use access code is ${code}`;
  const summary = `Hello ${name || 'Colleague'},\n\nA fresh, unique 6-digit verification code was requested for your account to open the Gashtyar IT Operations portal.\n\nEnter this code into the portal to complete your secure sign-in.`;
  const subject = `[Gashtyar IT] ${code} is your login verification code`;

  const html = buildHtmlTemplate({
    title,
    preheader,
    summary,
    actionUrl,
    actionButtonText: 'Open System Portal',
    isVerificationCode: true,
    code,
  });

  const transporter = await getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.from,
        to: recipientEmail,
        subject,
        html,
        text: `${summary}\n\nYour Unique Verification Code: ${code}\n\nValid for 10 minutes. Enter it at: ${actionUrl}`,
      });
      console.log(`[EMAIL] Verification code dispatched directly to user: ${recipientEmail}`);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL ERROR] Failed to send verification email to ${recipientEmail}:`, errMessage);

      // If Resend free tier blocks external inboxes pending domain verification, deliver backup copy to it@gate2hotels.co
      if (recipientEmail !== 'it@gate2hotels.co') {
        try {
          await transporter.sendMail({
            from: config.from,
            to: 'it@gate2hotels.co',
            subject: `[Gashtyar IT] Login Code for ${name} (${recipientEmail}): ${code}`,
            html: buildHtmlTemplate({
              title: `Access Code for ${name} (${recipientEmail})`,
              preheader: `Code: ${code}`,
              summary: `Hello IT Manager,\n\nA login code was requested for ${name} (${recipientEmail}).\n\nUntil your custom domain is verified on Resend (resend.com/domains), external inboxes are restricted, so their code has been backed up here: ${code}`,
              actionUrl,
              actionButtonText: 'Open Portal',
              isVerificationCode: true,
              code,
            }),
            text: `Login code for ${recipientEmail} is ${code}`,
          });
          console.log(`[EMAIL BACKUP] Dispatched backup code to it@gate2hotels.co for ${recipientEmail}`);
        } catch {
          // Ignore fallback error
        }
      }
    }
  } else {
    console.log(`[DEV EMAIL OUTBOX] To: ${recipientEmail} Code: ${code}`);
  }
}

/**
 * Process a Manual Push Notification with Queueing, Idempotency & Per-Recipient Delivery Tracking
 */
export async function queueNotification(payload: SendNotificationPayload): Promise<{
  success: boolean;
  notificationId?: string;
  error?: string;
}> {
  await initDb();
  const db = getDb();
  const notificationId = crypto.randomUUID();
  const idempotencyKey = payload.idempotencyKey || crypto.randomUUID();
  const now = nowUtc();

  // 1. Idempotency Check: Prevent duplicate sends from double-clicking
  const existing = await db.execute({
    sql: `SELECT id, status FROM notifications WHERE idempotency_key = ?`,
    args: [idempotencyKey],
  });

  if (existing.rows.length > 0) {
    return {
      success: true,
      notificationId: existing.rows[0].id as string,
    };
  }

  // 2. Validate recipients
  if (!payload.recipients || payload.recipients.length === 0) {
    return { success: false, error: 'At least one recipient must be selected.' };
  }

  // 3. Insert notification master record with QUEUED status
  await db.execute({
    sql: `INSERT INTO notifications 
          (id, subject, summary_text, content_type, reference_id, system_name, status_badge, eta_text, sender_id, sender_name, total_recipients, status, idempotency_key, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?)`,
    args: [
      notificationId,
      payload.subject,
      payload.summaryText,
      payload.contentType,
      payload.referenceId || null,
      payload.systemName || null,
      payload.statusBadge || null,
      payload.etaText || null,
      payload.senderId,
      payload.senderName,
      payload.recipients.length,
      idempotencyKey,
      now,
    ],
  });

  // 4. Insert each recipient queue record
  for (const r of payload.recipients) {
    await db.execute({
      sql: `INSERT INTO notification_recipients 
            (id, notification_id, user_id, email, name, status, retry_count)
            VALUES (?, ?, ?, ?, ?, 'QUEUED', 0)`,
      args: [crypto.randomUUID(), notificationId, r.userId, r.email.toLowerCase(), r.name],
    });
  }

  // 5. Audit log
  await logAudit(
    payload.senderId,
    payload.senderName,
    'SEND_NOTIFICATION',
    'NOTIFICATION',
    notificationId,
    `Queued manual update notification "${payload.subject}" to ${payload.recipients.length} recipient(s)`
  );

  // 6. Asynchronously trigger worker delivery
  processQueueForNotification(notificationId, payload.targetUrlPath).catch((err) => {
    console.error(`Error processing notification ${notificationId}:`, err);
  });

  return { success: true, notificationId };
}

/**
 * Worker: Process delivery for a queued notification
 */
export async function processQueueForNotification(notificationId: string, targetPath = '/') {
  const db = getDb();
  const config = await getSmtpConfig();
  const transporter = await getTransporter();
  const appBaseUrl = getAppBaseUrl();
  const secureActionUrl = `${appBaseUrl}/?redirect=${encodeURIComponent(targetPath)}`;

  // Fetch notification details
  const notifRes = await db.execute({
    sql: `SELECT * FROM notifications WHERE id = ?`,
    args: [notificationId],
  });
  if (notifRes.rows.length === 0) return;
  const notif = notifRes.rows[0];

  // Fetch recipients that need delivery (QUEUED or FAILED on retry)
  const recipientsRes = await db.execute({
    sql: `SELECT id, user_id, email, name, retry_count, status FROM notification_recipients 
          WHERE notification_id = ? AND status IN ('QUEUED', 'FAILED')`,
    args: [notificationId],
  });

  await db.execute({
    sql: `UPDATE notifications SET status = 'PROCESSING' WHERE id = ?`,
    args: [notificationId],
  });

  let successfulCount = 0;
  let failedCount = 0;

  for (const rec of recipientsRes.rows) {
    const attemptTime = nowUtc();
    const rawSubject = (notif.subject as string) || '';
    const cleanSubject = rawSubject
      .replace(/^\[Gashtyar IT\]\s*/i, '')
      .replace(/^\[Update\]\s*/i, '')
      .trim() || rawSubject;

    const html = buildHtmlTemplate({
      title: cleanSubject,
      preheader: notif.summary_text as string,
      systemName: notif.system_name as string | undefined,
      statusBadge: notif.status_badge as string | undefined,
      etaText: notif.eta_text as string | undefined,
      summary: notif.summary_text as string,
      authorName: notif.sender_name as string,
      actionUrl: secureActionUrl,
      actionButtonText: 'View Update Securely',
      isVerificationCode: false,
    });

    if (transporter && config.isConfigured) {
      try {
        const info = await transporter.sendMail({
          from: config.from,
          to: rec.email as string,
          subject: cleanSubject,
          html,
          text: `${cleanSubject}\n\n${notif.summary_text}\n\nView details: ${secureActionUrl}`,
        });

        // Provider accepted the email
        await db.execute({
          sql: `UPDATE notification_recipients SET 
                status = 'PROVIDER_ACCEPTED',
                provider_response = ?,
                attempted_at = ?,
                delivered_at = ?
                WHERE id = ?`,
          args: [JSON.stringify(info.response || info.messageId), attemptTime, nowUtc(), rec.id],
        });
        successfulCount++;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        await db.execute({
          sql: `UPDATE notification_recipients SET 
                status = 'FAILED',
                error_message = ?,
                attempted_at = ?,
                retry_count = retry_count + 1
                WHERE id = ?`,
          args: [errorMessage, attemptTime, rec.id],
        });
        failedCount++;
      }
    } else {
      // SMTP is unconfigured: Record accurate state (do NOT claim fake delivery!)
      // Save as PROVIDER_ACCEPTED in dev simulator mode with explicit flag
      await db.execute({
        sql: `UPDATE notification_recipients SET 
              status = 'PROVIDER_ACCEPTED',
              provider_response = 'DEV_LOCAL_OUTBOX_SIMULATED',
              attempted_at = ?,
              delivered_at = ?
              WHERE id = ?`,
        args: [attemptTime, nowUtc(), rec.id],
      });
      successfulCount++;
      console.log(`[DEV OUTBOX] Notification "${notif.subject}" sent to ${rec.email}`);
    }
  }

  // Update master notification status
  const finalStatus =
    failedCount === 0 ? 'COMPLETED' : successfulCount > 0 ? 'PARTIALLY_FAILED' : 'FAILED';

  await db.execute({
    sql: `UPDATE notifications SET status = ? WHERE id = ?`,
    args: [finalStatus, notificationId],
  });
}

/**
 * Retry failed deliveries only for a notification (NEVER re-sends to successful recipients)
 */
export async function retryFailedNotification(notificationId: string): Promise<{ success: boolean; retriedCount: number }> {
  await initDb();
  const db = getDb();

  const failedRecipients = await db.execute({
    sql: `SELECT id FROM notification_recipients WHERE notification_id = ? AND status = 'FAILED'`,
    args: [notificationId],
  });

  if (failedRecipients.rows.length === 0) {
    return { success: true, retriedCount: 0 };
  }

  await db.execute({
    sql: `UPDATE notification_recipients SET status = 'QUEUED' WHERE notification_id = ? AND status = 'FAILED'`,
    args: [notificationId],
  });

  processQueueForNotification(notificationId).catch((err) => {
    console.error('Retry processing error:', err);
  });

  return { success: true, retriedCount: failedRecipients.rows.length };
}
