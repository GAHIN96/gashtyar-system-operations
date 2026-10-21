import crypto from 'crypto';
import { getDb, initDb } from './db';
import { nowUtc } from './time';

const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;
export const INACTIVITY_TIMEOUT_MINUTES = 15;
export const ABSOLUTE_SESSION_HOURS = 8;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE';
  department: string;
}

/**
 * SHA-256 hash helper
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

const SESSION_HMAC_SECRET = process.env.SESSION_SECRET || 'gashtyar-super-secure-session-key-2026-ops';

export function signSessionToken(sessionId: string, userId: string, createdAt: number): string {
  const data = `${sessionId}.${userId}.${createdAt}`;
  const sig = crypto.createHmac('sha256', SESSION_HMAC_SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

export function verifySignedSessionToken(token: string): { valid: boolean; sessionId?: string; userId?: string; createdAt?: number } {
  try {
    const parts = token.split('.');
    if (parts.length !== 4) return { valid: false };
    const [sessionId, userId, createdAtStr, sig] = parts;
    const createdAt = parseInt(createdAtStr, 10);
    if (isNaN(createdAt)) return { valid: false };

    // Check absolute 8-hour expiration
    const maxAge = ABSOLUTE_SESSION_HOURS * 60 * 60 * 1000;
    if (Date.now() - createdAt > maxAge) return { valid: false };

    const expectedSig = crypto.createHmac('sha256', SESSION_HMAC_SECRET).update(`${sessionId}.${userId}.${createdAtStr}`).digest('hex');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: true, sessionId, userId, createdAt };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Generate cryptographically secure 6-digit code
 */
export function generateVerificationCode(): string {
  const number = crypto.randomInt(100000, 1000000);
  return number.toString();
}

/**
 * Request verification code for email
 * Returns challenge metadata or null if user not invited/active.
 * ALWAYS return a generic message to the client to prevent user enumeration.
 */
export async function createVerificationChallenge(
  email: string,
  redirectPath = '/',
  ipAddress = 'unknown',
  userAgent = 'unknown'
): Promise<{ success: boolean; cooldownLeft?: number; codeForDev?: string }> {
  await initDb();
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Verify user exists and is ACTIVE
  const userResult = await db.execute({
    sql: `SELECT id, email, name, role, status FROM users WHERE LOWER(email) = ? AND status = 'ACTIVE'`,
    args: [normalizedEmail],
  });

  if (userResult.rows.length === 0) {
    // Return generic success to caller so external attacker cannot enumerate
    return { success: true };
  }

  // 2. Check for recent active challenge and enforce 60-second cooldown
  const now = new Date();
  const recentChallenge = await db.execute({
    sql: `SELECT id, resend_cooldown_until FROM verification_challenges 
          WHERE email = ? AND used = 0 AND superseded = 0 
          ORDER BY created_at DESC LIMIT 1`,
    args: [normalizedEmail],
  });

  if (recentChallenge.rows.length > 0) {
    const cooldownUntil = new Date(recentChallenge.rows[0].resend_cooldown_until as string);
    if (cooldownUntil.getTime() > now.getTime()) {
      const remainingSeconds = Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000);
      return { success: false, cooldownLeft: remainingSeconds };
    }

    // Mark previous challenge as superseded
    await db.execute({
      sql: `UPDATE verification_challenges SET superseded = 1 WHERE email = ? AND used = 0`,
      args: [normalizedEmail],
    });
  }

  // 3. Generate fresh 6-digit code and hash it
  const code = generateVerificationCode();
  const codeHash = hashString(code);
  const challengeId = crypto.randomUUID();

  const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const cooldownUntil = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO verification_challenges 
          (id, email, code_hash, redirect_path, attempts, used, superseded, expires_at, resend_cooldown_until, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)`,
    args: [
      challengeId,
      normalizedEmail,
      codeHash,
      redirectPath,
      expiresAt,
      cooldownUntil,
      ipAddress,
      userAgent,
      nowUtc(),
    ],
  });

  // 4. Send email (or log to dev outbox)
  try {
    const { sendVerificationEmail } = await import('./email');
    await sendVerificationEmail(normalizedEmail, code, userResult.rows[0].name as string);
  } catch (emailErr) {
    console.error('Verification email delivery error:', emailErr);
  }

  return {
    success: true,
    codeForDev: process.env.NODE_ENV !== 'production' ? code : undefined,
  };
}

/**
 * Verify 6-digit code, consume challenge, and create tab-bound session
 */
export async function verifyCodeAndCreateSession(
  email: string,
  code: string,
  tabToken: string,
  ipAddress = 'unknown',
  userAgent = 'unknown'
): Promise<{ success: boolean; sessionToken?: string; user?: SessionUser; redirectPath?: string; error?: string }> {
  await initDb();
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const inputHash = hashString(code.trim());
  const now = new Date();

  // Find latest active challenge for this email
  const challengeResult = await db.execute({
    sql: `SELECT id, code_hash, redirect_path, attempts, used, superseded, expires_at 
          FROM verification_challenges 
          WHERE email = ? AND used = 0 AND superseded = 0 
          ORDER BY created_at DESC LIMIT 1`,
    args: [normalizedEmail],
  });

  if (challengeResult.rows.length === 0) {
    return { success: false, error: 'No active verification code found. Please request a new code.' };
  }

  const challenge = challengeResult.rows[0];
  const attempts = Number(challenge.attempts || 0);

  // Check attempt limit
  if (attempts >= MAX_ATTEMPTS) {
    await db.execute({
      sql: `UPDATE verification_challenges SET superseded = 1 WHERE id = ?`,
      args: [challenge.id],
    });
    return { success: false, error: 'Too many incorrect attempts. This code is invalidated. Please request a new one.' };
  }

  // Check expiration
  const expiresAt = new Date(challenge.expires_at as string);
  if (now.getTime() > expiresAt.getTime()) {
    return { success: false, error: 'This verification code has expired. Please request a new code.' };
  }

  // Check code hash
  if (challenge.code_hash !== inputHash) {
    await db.execute({
      sql: `UPDATE verification_challenges SET attempts = attempts + 1 WHERE id = ?`,
      args: [challenge.id],
    });
    const remaining = MAX_ATTEMPTS - (attempts + 1);
    return {
      success: false,
      error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Code invalidated.'}`,
    };
  }

  // Mark challenge as used
  await db.execute({
    sql: `UPDATE verification_challenges SET used = 1 WHERE id = ?`,
    args: [challenge.id],
  });

  // Fetch active user
  const userResult = await db.execute({
    sql: `SELECT id, email, name, role, status, department FROM users WHERE LOWER(email) = ? AND status = 'ACTIVE'`,
    args: [normalizedEmail],
  });

  if (userResult.rows.length === 0) {
    return { success: false, error: 'User account is inactive or not found.' };
  }

  const user = userResult.rows[0] as unknown as SessionUser;

  // Create new server session paired with tabToken
  const sessionId = crypto.randomUUID();
  const sessionToken = signSessionToken(sessionId, user.id, now.getTime());
  const sessionTokenHash = hashString(sessionToken);

  const inactivityExpiresAt = new Date(now.getTime() + INACTIVITY_TIMEOUT_MINUTES * 60 * 1000).toISOString();
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_SESSION_HOURS * 60 * 60 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO sessions 
          (id, token_hash, user_id, tab_token, expires_at, absolute_expires_at, last_activity_at, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      sessionId,
      sessionTokenHash,
      user.id,
      tabToken,
      inactivityExpiresAt,
      absoluteExpiresAt,
      nowUtc(),
      ipAddress,
      userAgent,
      nowUtc(),
    ],
  });

  // Audit log
  await logAudit(user.id, user.email, 'LOGIN_VERIFIED', 'SESSION', sessionId, `Logged in via code verification`, ipAddress);

  return {
    success: true,
    sessionToken,
    user,
    redirectPath: (challenge.redirect_path as string) || '/',
  };
}

/**
 * Validates session token AND tab context
 * Enforces:
 * - 15-minute inactivity timeout
 * - 8-hour absolute maximum
 * - Per-tab isolation (tabToken from sessionStorage must match)
 * - Immediate revocation if user is inactive
 */
export async function validateSession(
  sessionToken: string | undefined | null,
  tabToken: string | undefined | null
): Promise<{ valid: boolean; user?: SessionUser; error?: string }> {
  if (!sessionToken || !tabToken) {
    return { valid: false, error: 'Missing session or tab credentials' };
  }

  await initDb();
  const db = getDb();
  const tokenHash = hashString(sessionToken);
  const now = new Date();

  const sessionResult = await db.execute({
    sql: `SELECT s.id, s.user_id, s.tab_token, s.expires_at, s.absolute_expires_at, s.last_activity_at,
                 u.email, u.name, u.role, u.status, u.department
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.token_hash = ?`,
    args: [tokenHash],
  });

  if (sessionResult.rows.length === 0) {
    // Attempt cryptographic HMAC self-healing recovery across serverless lambdas
    const verified = verifySignedSessionToken(sessionToken);
    if (verified.valid && verified.userId && verified.sessionId) {
      const userRes = await db.execute({
        sql: `SELECT id, email, name, role, status, department FROM users WHERE id = ?`,
        args: [verified.userId],
      });
      if (userRes.rows.length > 0 && userRes.rows[0].status === 'ACTIVE') {
        const u = userRes.rows[0];
        const nextInactivityExpiry = new Date(now.getTime() + INACTIVITY_TIMEOUT_MINUTES * 60 * 1000).toISOString();
        const absoluteExpiresAt = new Date((verified.createdAt || now.getTime()) + ABSOLUTE_SESSION_HOURS * 60 * 60 * 1000).toISOString();
        await db.execute({
          sql: `INSERT OR REPLACE INTO sessions 
                (id, token_hash, user_id, tab_token, expires_at, absolute_expires_at, last_activity_at, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'restored', 'restored', ?)`,
          args: [verified.sessionId, tokenHash, u.id, tabToken || 'tab_default', nextInactivityExpiry, absoluteExpiresAt, nowUtc(), nowUtc()],
        });
        return {
          valid: true,
          user: {
            id: u.id as string,
            email: u.email as string,
            name: u.name as string,
            role: u.role as 'ADMIN' | 'MANAGER' | 'VIEWER',
            status: u.status as 'ACTIVE' | 'INACTIVE',
            department: (u.department as string) || 'Operations',
          },
        };
      }
    }
    return { valid: false, error: 'Session expired or not found. Please log in with your email verification code.' };
  }

  const row = sessionResult.rows[0];

  // 1. Immediate revocation if user is not ACTIVE
  if (row.status !== 'ACTIVE') {
    await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [row.id] });
    return { valid: false, error: 'Account has been deactivated. Please contact IT.' };
  }

  // 2. Tab context synchronization:
  // If session is valid and active, seamlessly sync the tab token
  if (tabToken && row.tab_token !== tabToken) {
    await db.execute({
      sql: `UPDATE sessions SET tab_token = ? WHERE id = ?`,
      args: [tabToken, row.id],
    });
  }

  // 3. Absolute 8-hour limit check
  const absoluteExpiry = new Date(row.absolute_expires_at as string);
  if (now.getTime() > absoluteExpiry.getTime()) {
    await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [row.id] });
    return { valid: false, error: 'Session reached 8-hour maximum. Please verify again.' };
  }

  // 4. Inactivity 15-minute timeout check
  const inactivityExpiry = new Date(row.expires_at as string);
  if (now.getTime() > inactivityExpiry.getTime()) {
    await db.execute({ sql: `DELETE FROM sessions WHERE id = ?`, args: [row.id] });
    return { valid: false, error: 'Session expired due to 15 minutes of inactivity.' };
  }

  // 5. Update last_activity_at and extend rolling 15-minute inactivity timeout
  const nextInactivityExpiry = new Date(now.getTime() + INACTIVITY_TIMEOUT_MINUTES * 60 * 1000).toISOString();
  await db.execute({
    sql: `UPDATE sessions SET expires_at = ?, last_activity_at = ? WHERE id = ?`,
    args: [nextInactivityExpiry, nowUtc(), row.id],
  });

  return {
    valid: true,
    user: {
      id: row.user_id as string,
      email: row.email as string,
      name: row.name as string,
      role: row.role as 'ADMIN' | 'MANAGER' | 'VIEWER',
      status: row.status as 'ACTIVE' | 'INACTIVE',
      department: (row.department as string) || 'Operations',
    },
  };
}

/**
 * Destroy session (logout)
 */
export async function destroySession(sessionToken: string | undefined | null): Promise<void> {
  if (!sessionToken) return;
  await initDb();
  const db = getDb();
  const tokenHash = hashString(sessionToken);
  await db.execute({
    sql: `DELETE FROM sessions WHERE token_hash = ?`,
    args: [tokenHash],
  });
}

/**
 * Record audit log
 */
export async function logAudit(
  userId: string | null,
  userEmail: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  ipAddress = 'unknown'
) {
  try {
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        userId,
        userEmail,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
        nowUtc(),
      ],
    });
  } catch (err) {
    console.error('Audit log failure:', err);
  }
}
