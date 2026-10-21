import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { nowUtc } from '@/lib/time';
import { logAudit } from '@/lib/auth';
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
    // "Revoking a user must immediately revoke their access."
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
