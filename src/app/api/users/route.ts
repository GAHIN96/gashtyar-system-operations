import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { nowUtc } from '@/lib/time';
import { logAudit } from '@/lib/auth';
import { getTransporter, getSmtpConfig, buildHtmlTemplate } from '@/lib/email';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  await initDb();
  const db = getDb();

  const forRecipientsOnly = req.nextUrl.searchParams.get('recipients') === 'true';

  if (forRecipientsOnly) {
    // Authorized users for notification recipient selector (ID, name, email, role)
    const activeUsersRes = await db.execute(`
      SELECT id, name, email, role, department 
      FROM users 
      WHERE status = 'ACTIVE' 
      ORDER BY role ASC, name ASC
    `);
    return NextResponse.json({ users: activeUsersRes.rows });
  }

  // Authorized managers and admins can view directory and audit logs (audit transparency requirement)
  const usersRes = await db.execute(`SELECT id, email, name, role, status, department, invited_by, created_at, updated_at FROM users ORDER BY created_at DESC`);
  const auditRes = await db.execute(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`);

  return NextResponse.json({
    users: usersRes.rows,
    auditLogs: auditRes.rows,
    isAdmin: auth.user?.role === 'ADMIN',
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { email, name, role, department } = body;

    if (!email || !name || !role) {
      return NextResponse.json({ error: 'Email, name, and role are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const existing = await db.execute({
      sql: `SELECT id FROM users WHERE LOWER(email) = ?`,
      args: [normalizedEmail],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 400 });
    }

    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const now = nowUtc();

    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, status, department, invited_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`,
      args: [id, normalizedEmail, name.trim(), role, department || 'Management', auth.user!.name, now, now],
    });

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'INVITE_USER',
      'USER',
      id,
      `Invited ${name} (${normalizedEmail}) with role ${role}`
    );

    // Send invitation email if SMTP is configured
    try {
      const transporter = await getTransporter();
      const smtpConfig = await getSmtpConfig();
      if (transporter && smtpConfig.isConfigured) {
        const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const roleLabel =
          role === 'ADMIN'
            ? 'IT Manager (Super Admin)'
            : role === 'MANAGER'
            ? 'Manager (View & Comment)'
            : 'Auditor (Viewer)';

        const html = buildHtmlTemplate({
          title: 'Welcome to Gashtyar IT Operations',
          preheader: `You have been granted access as ${roleLabel}`,
          summary: `Hello ${name.trim()},\n\nYou have been granted access to the Gashtyar Travel & Tourism IT Operations and Infrastructure Monitoring Portal by ${auth.user!.name}.\n\nYour assigned role is: ${roleLabel} (${department || 'Management'}).\n\nYou can access the portal and sign in securely with 6-digit email verification anytime.`,
          actionUrl: appBaseUrl,
          actionButtonText: 'Access Gashtyar Operations Portal',
        });

        await transporter.sendMail({
          from: smtpConfig.from,
          to: normalizedEmail,
          subject: `[Gashtyar IT] You have been invited to Gashtyar Operations Portal`,
          html,
          text: `Hello ${name},\n\nYou have been invited to Gashtyar IT Operations Portal as ${roleLabel}.\nAccess the portal: ${appBaseUrl}`,
        });
      }
    } catch (mailErr) {
      console.warn('Could not send invitation email:', mailErr);
    }

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error('Invite user error:', err);
    return NextResponse.json({ error: 'Failed to invite user.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { id, name, role, status, department } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Prevent admin from deactivating themselves
    if (id === auth.user!.id && status === 'INACTIVE') {
      return NextResponse.json({ error: 'You cannot deactivate your own administrative account.' }, { status: 400 });
    }

    const db = getDb();
    const now = nowUtc();

    await db.execute({
      sql: `UPDATE users SET
            name = COALESCE(?, name),
            role = COALESCE(?, role),
            status = COALESCE(?, status),
            department = COALESCE(?, department),
            updated_at = ?
            WHERE id = ?`,
      args: [name, role, status, department, now, id],
    });

    // Immediate Revocation:
    // If status changed to INACTIVE, immediately delete all active sessions for this user!
    if (status === 'INACTIVE') {
      await db.execute({ sql: `DELETE FROM sessions WHERE user_id = ?`, args: [id] });
    }

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'UPDATE_USER',
      'USER',
      id,
      `Updated user ${id} (status: ${status || 'unchanged'}, role: ${role || 'unchanged'})`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (id === auth.user!.id) {
      return NextResponse.json({ error: 'You cannot delete your own administrative account.' }, { status: 400 });
    }

    const db = getDb();
    const userRes = await db.execute({
      sql: `SELECT id, name, email FROM users WHERE id = ?`,
      args: [id],
    });

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const targetUser = userRes.rows[0];

    // Delete user sessions
    await db.execute({ sql: `DELETE FROM sessions WHERE user_id = ?`, args: [id] });
    // Delete user record
    await db.execute({ sql: `DELETE FROM users WHERE id = ?`, args: [id] });

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'DELETE_USER',
      'USER',
      id,
      `Permanently deleted user account "${targetUser.name}" (${targetUser.email})`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
  }
}

