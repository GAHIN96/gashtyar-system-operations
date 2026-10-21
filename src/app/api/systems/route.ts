import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { nowUtc } from '@/lib/time';
import { logAudit } from '@/lib/auth';
import { maskSensitiveConfigs } from '@/lib/mask';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  await initDb();
  const db = getDb();
  const includeArchived = req.nextUrl.searchParams.get('archived') === 'true';

  const sql = `
    SELECT s.*,
      (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'SYSTEM' AND c.target_id = s.id) as comment_count,
      (SELECT COUNT(*) FROM incident_systems isys 
       JOIN incidents inc ON inc.id = isys.incident_id 
       WHERE isys.system_id = s.id AND inc.status NOT IN ('RESOLVED', 'CLOSED')) as active_incidents_count,
      (SELECT u.title FROM update_systems us 
       JOIN updates u ON u.id = us.update_id 
       WHERE us.system_id = s.id AND u.publication_state = 'PUBLISHED' 
       ORDER BY u.release_date DESC, u.created_at DESC LIMIT 1) as latest_release_title,
      (SELECT u.version FROM update_systems us 
       JOIN updates u ON u.id = us.update_id 
       WHERE us.system_id = s.id AND u.publication_state = 'PUBLISHED' 
       ORDER BY u.release_date DESC, u.created_at DESC LIMIT 1) as latest_release_version,
      (SELECT u.release_date FROM update_systems us 
       JOIN updates u ON u.id = us.update_id 
       WHERE us.system_id = s.id AND u.publication_state = 'PUBLISHED' 
       ORDER BY u.release_date DESC, u.created_at DESC LIMIT 1) as latest_release_date
    FROM systems s
    ${includeArchived ? '' : 'WHERE s.is_archived = 0'}
    ORDER BY s.sort_order ASC, s.name ASC
  `;
  const result = await db.execute(sql);

  const isAdmin = auth.user?.role === 'ADMIN';

  // Apply secret masking for non-admin viewers
  const systems = result.rows.map((row: any) => {
    if (!isAdmin && row.config_details) {
      return {
        ...row,
        config_details: maskSensitiveConfigs(row.config_details),
      };
    }
    return row;
  });

  return NextResponse.json({ systems });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      name,
      description,
      category,
      owner,
      status,
      sort_order,
      business_impact,
      hosting_env,
      domain_names,
      tech_stack,
      connected_integrations,
      responsible_team,
      purpose,
      config_details,
      health_check_type,
      logo_url,
    } = body;

    if (!name || !category || !owner) {
      return NextResponse.json({ error: 'Name, category, and owner are required.' }, { status: 400 });
    }

    const db = getDb();
    const id = `sys_${crypto.randomUUID().slice(0, 8)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const now = nowUtc();

    await db.execute({
      sql: `INSERT INTO systems (
              id, name, slug, description, category, owner, status, sort_order, is_archived,
              business_impact, investigation_stage, hosting_env, domain_names, tech_stack,
              connected_integrations, responsible_team, purpose, config_details,
              health_check_type, logo_url, last_health_check_at, last_updated_by, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Operational and monitored', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name,
        slug,
        description || '',
        category,
        owner,
        status || 'OPERATIONAL',
        sort_order || 0,
        business_impact || '',
        hosting_env || '',
        domain_names || '',
        tech_stack || '',
        connected_integrations || '',
        responsible_team || owner,
        purpose || description || '',
        config_details || '',
        health_check_type || 'Manual Status Verification',
        logo_url || '',
        now,
        auth.user?.name || 'Gahin Mayi',
        now,
        now,
      ],
    });

    await logAudit(
      auth.user?.id || null,
      auth.user?.email || null,
      'CREATE_SYSTEM',
      'SYSTEM',
      id,
      `Created system "${name}" (${category})`
    );

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error('Create system error:', err);
    return NextResponse.json({ error: 'Failed to create system.' }, { status: 500 });
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
      description,
      category,
      owner,
      status,
      sort_order,
      is_archived,
      business_impact,
      investigation_stage,
      eta_text,
      eta_reason,
      hosting_env,
      domain_names,
      tech_stack,
      connected_integrations,
      responsible_team,
      purpose,
      config_details,
      health_check_type,
      logo_url,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'System ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const now = nowUtc();

    await db.execute({
      sql: `UPDATE systems SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            category = COALESCE(?, category),
            owner = COALESCE(?, owner),
            status = COALESCE(?, status),
            sort_order = COALESCE(?, sort_order),
            is_archived = COALESCE(?, is_archived),
            business_impact = COALESCE(?, business_impact),
            investigation_stage = COALESCE(?, investigation_stage),
            eta_text = CASE WHEN ? = 1 THEN ? ELSE eta_text END,
            eta_reason = CASE WHEN ? = 1 THEN ? ELSE eta_reason END,
            hosting_env = COALESCE(?, hosting_env),
            domain_names = COALESCE(?, domain_names),
            tech_stack = COALESCE(?, tech_stack),
            connected_integrations = COALESCE(?, connected_integrations),
            responsible_team = COALESCE(?, responsible_team),
            purpose = COALESCE(?, purpose),
            config_details = COALESCE(?, config_details),
            health_check_type = COALESCE(?, health_check_type),
            logo_url = CASE WHEN ? = 1 THEN ? ELSE logo_url END,
            last_health_check_at = ?,
            last_updated_by = ?,
            updated_at = ?
            WHERE id = ?`,
      args: [
        name !== undefined ? name : null,
        description !== undefined ? description : null,
        category !== undefined ? category : null,
        owner !== undefined ? owner : null,
        status !== undefined ? status : null,
        sort_order !== undefined ? sort_order : null,
        is_archived !== undefined ? (is_archived ? 1 : 0) : null,
        business_impact !== undefined ? business_impact : null,
        investigation_stage !== undefined ? investigation_stage : null,
        eta_text !== undefined ? 1 : 0,
        eta_text !== undefined ? eta_text : null,
        eta_reason !== undefined ? 1 : 0,
        eta_reason !== undefined ? eta_reason : null,
        hosting_env !== undefined ? hosting_env : null,
        domain_names !== undefined ? domain_names : null,
        tech_stack !== undefined ? tech_stack : null,
        connected_integrations !== undefined ? connected_integrations : null,
        responsible_team !== undefined ? responsible_team : null,
        purpose !== undefined ? purpose : null,
        config_details !== undefined ? config_details : null,
        health_check_type !== undefined ? health_check_type : null,
        logo_url !== undefined ? 1 : 0,
        logo_url !== undefined ? logo_url : '',
        now,
        auth.user?.name || 'Gahin Mayi',
        now,
        id,
      ],
    });

    await logAudit(
      auth.user?.id || null,
      auth.user?.email || null,
      'UPDATE_SYSTEM',
      'SYSTEM',
      id,
      `Updated system ${name || id}`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Update system error:', err);
    return NextResponse.json({ error: 'Failed to update system.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'MANAGER');
  if (auth.errorResponse) return auth.errorResponse;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'System ID is required.' }, { status: 400 });
  }

  const db = getDb();
  await db.execute({
    sql: `UPDATE systems SET is_archived = 1, updated_at = ? WHERE id = ?`,
    args: [nowUtc(), id],
  });

  await logAudit(auth.user?.id || null, auth.user?.email || null, 'ARCHIVE_SYSTEM', 'SYSTEM', id, `Archived system ${id}`);

  return NextResponse.json({ success: true });
}
