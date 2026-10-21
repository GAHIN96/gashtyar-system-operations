import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { maskSensitiveConfigs } from '@/lib/mask';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'System ID required' }, { status: 400 });
  }

  await initDb();
  const db = getDb();
  const isAdmin = auth.user?.role === 'ADMIN';

  // 1. Fetch System
  const sysResult = await db.execute({
    sql: `SELECT * FROM systems WHERE id = ? OR slug = ? LIMIT 1`,
    args: [id, id],
  });

  if (sysResult.rows.length === 0) {
    return NextResponse.json({ error: 'System not found' }, { status: 404 });
  }

  const system = sysResult.rows[0] as any;
  if (!isAdmin && system.config_details) {
    system.config_details = maskSensitiveConfigs(system.config_details);
  }

  // 2. Fetch Associated Incidents
  const incResult = await db.execute({
    sql: `SELECT inc.* FROM incidents inc
          JOIN incident_systems isys ON isys.incident_id = inc.id
          WHERE isys.system_id = ?
          ORDER BY inc.created_at DESC`,
    args: [system.id],
  });

  // 3. Fetch Associated Releases & Updates
  const updResult = await db.execute({
    sql: `SELECT u.* FROM updates u
          JOIN update_systems us ON us.update_id = u.id
          WHERE us.system_id = ?
          ORDER BY u.release_date DESC, u.created_at DESC`,
    args: [system.id],
  });

  // 4. Fetch Discussion Comments
  const commentsResult = await db.execute({
    sql: `SELECT * FROM comments 
          WHERE target_type = 'SYSTEM' AND target_id = ?
          ORDER BY created_at ASC`,
    args: [system.id],
  });

  // 5. Fetch Activity / Audit Logs
  const auditResult = await db.execute({
    sql: `SELECT * FROM audit_logs 
          WHERE entity_id = ? OR details LIKE ?
          ORDER BY created_at DESC LIMIT 30`,
    args: [system.id, `%${system.name}%`],
  });

  return NextResponse.json({
    system,
    incidents: incResult.rows,
    updates: updResult.rows,
    comments: commentsResult.rows,
    auditLogs: auditResult.rows,
  });
}
