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

  const serversRes = await db.execute(`
    SELECT s.*,
      (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'INFRASTRUCTURE' AND c.target_id = s.id) as comment_count
    FROM server_assets s
    ORDER BY s.name ASC
  `);

  // Detect stale checks: if last_check_at is older than 6 hours and health_status != 'MANUAL_STATUS'
  const now = new Date().getTime();
  const servers = serversRes.rows.map((row) => {
    let effectiveHealth = row.health_status as string;
    if (row.last_check_at) {
      const checkTime = new Date(row.last_check_at as string).getTime();
      const hoursAgo = (now - checkTime) / (1000 * 3600);
      if (hoursAgo > 6 && effectiveHealth !== 'MANUAL_STATUS') {
        effectiveHealth = 'STALE';
      }
    } else if (effectiveHealth !== 'MANUAL_STATUS') {
      effectiveHealth = 'UNKNOWN';
    }

    return {
      ...row,
      effectiveHealth,
    };
  });

  return NextResponse.json({ servers });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      name,
      purpose,
      hosting_provider,
      owner,
      health_status,
      database_health,
      backup_schedule,
      backup_retention,
      notes,
    } = body;

    if (!name || !purpose || !hosting_provider || !owner) {
      return NextResponse.json({ error: 'Name, purpose, hosting provider, and owner are required.' }, { status: 400 });
    }

    const db = getDb();
    const id = `srv_${crypto.randomUUID().slice(0, 8)}`;
    const now = nowUtc();

    await db.execute({
      sql: `INSERT INTO server_assets 
            (id, name, purpose, hosting_provider, owner, health_status, database_health, backup_schedule, backup_retention, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name,
        purpose,
        hosting_provider,
        owner,
        health_status || 'MANUAL_STATUS',
        database_health || 'NORMAL',
        backup_schedule || 'Daily at 02:00 Baghdad Time',
        backup_retention || '30 Days',
        notes || '',
        now,
        now,
      ],
    });

    await logAudit(auth.user!.id, auth.user!.email, 'CREATE_SERVER', 'INFRASTRUCTURE', id, `Added server asset ${name}`);

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error('Create server asset error:', err);
    return NextResponse.json({ error: 'Failed to create server asset.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      id,
      name,
      purpose,
      hosting_provider,
      owner,
      health_status,
      cpu_percent,
      memory_percent,
      disk_percent,
      database_health,
      last_backup_at,
      backup_result,
      backup_schedule,
      backup_retention,
      last_restore_test_at,
      restore_outcome,
      upcoming_maintenance,
      notes,
      recordManualCheck,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Server ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const now = nowUtc();

    await db.execute({
      sql: `UPDATE server_assets SET
            name = COALESCE(?, name),
            purpose = COALESCE(?, purpose),
            hosting_provider = COALESCE(?, hosting_provider),
            owner = COALESCE(?, owner),
            health_status = COALESCE(?, health_status),
            cpu_percent = ?,
            memory_percent = ?,
            disk_percent = ?,
            last_check_at = CASE WHEN ? = 1 THEN ? ELSE last_check_at END,
            database_health = COALESCE(?, database_health),
            last_backup_at = COALESCE(?, last_backup_at),
            backup_result = COALESCE(?, backup_result),
            backup_schedule = COALESCE(?, backup_schedule),
            backup_retention = COALESCE(?, backup_retention),
            last_restore_test_at = COALESCE(?, last_restore_test_at),
            restore_outcome = COALESCE(?, restore_outcome),
            upcoming_maintenance = ?,
            notes = COALESCE(?, notes),
            updated_at = ?
            WHERE id = ?`,
      args: [
        name,
        purpose,
        hosting_provider,
        owner,
        health_status,
        cpu_percent !== undefined ? cpu_percent : null,
        memory_percent !== undefined ? memory_percent : null,
        disk_percent !== undefined ? disk_percent : null,
        recordManualCheck ? 1 : 0,
        now,
        database_health,
        last_backup_at,
        backup_result,
        backup_schedule,
        backup_retention,
        last_restore_test_at,
        restore_outcome,
        upcoming_maintenance !== undefined ? upcoming_maintenance : null,
        notes,
        now,
        id,
      ],
    });

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'UPDATE_SERVER',
      'INFRASTRUCTURE',
      id,
      `Updated server asset ${name || id}`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Update server asset error:', err);
    return NextResponse.json({ error: 'Failed to update server asset.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Server ID is required.' }, { status: 400 });
  }

  const db = getDb();
  const serverRes = await db.execute({ sql: `SELECT name FROM server_assets WHERE id = ?`, args: [id] });
  const serverName = serverRes.rows[0]?.name || id;

  await db.execute({ sql: `DELETE FROM server_assets WHERE id = ?`, args: [id] });

  await logAudit(
    auth.user!.id,
    auth.user!.email,
    'DELETE_SERVER',
    'INFRASTRUCTURE',
    id,
    `Deleted infrastructure asset "${serverName}"`
  );

  return NextResponse.json({ success: true });
}

