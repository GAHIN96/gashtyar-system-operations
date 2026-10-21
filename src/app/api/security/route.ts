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
  const isAdmin = auth.user?.role === 'ADMIN';

  // Fetch findings
  const findingsRes = await db.execute(`
    SELECT sf.*,
      (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'SECURITY' AND c.target_id = sf.id) as comment_count
    FROM security_findings sf
    ORDER BY 
      CASE sf.status WHEN 'OPEN' THEN 1 WHEN 'IN_PROGRESS' THEN 2 ELSE 3 END,
      CASE sf.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
      sf.due_date ASC
  `);

  // Mask restricted details if viewer is not Admin
  const findings = findingsRes.rows.map((f: any) => ({
    ...f,
    restricted_details: isAdmin ? f.restricted_details : undefined,
  }));

  // Aggregated security statistics
  const totalFindings = findings.length;
  const criticalCount = findings.filter((f: any) => f.severity === 'CRITICAL' && f.status !== 'RESOLVED').length;
  const highCount = findings.filter((f: any) => f.severity === 'HIGH' && f.status !== 'RESOLVED').length;
  const mediumCount = findings.filter((f: any) => f.severity === 'MEDIUM' && f.status !== 'RESOLVED').length;
  const lowCount = findings.filter((f: any) => f.severity === 'LOW' && f.status !== 'RESOLVED').length;

  const mfaCoverage = 94.2; // 100% on IT & privileged management
  const endpointCoverage = 96.0; // 72 of 75 branch machines enrolled

  return NextResponse.json({
    metrics: {
      totalFindings,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      mfaCoverage,
      endpointCoverage,
    },
    findings,
    isAdmin,
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { title, category, severity, status, affected_asset, owner, due_date, remediation_plan, restricted_details } = body;

    if (!title || !category || !severity || !affected_asset || !owner) {
      return NextResponse.json(
        { error: 'Title, category, severity, affected asset, and owner are required.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = `sec_${crypto.randomUUID().slice(0, 8)}`;
    const now = nowUtc();

    await db.execute({
      sql: `INSERT INTO security_findings 
            (id, title, category, severity, status, affected_asset, owner, due_date, remediation_plan, restricted_details, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        title,
        category,
        severity,
        status || 'OPEN',
        affected_asset,
        owner,
        due_date || null,
        remediation_plan || '',
        restricted_details || '',
        now,
        now,
      ],
    });

    await logAudit(auth.user!.id, auth.user!.email, 'CREATE_SECURITY_FINDING', 'SECURITY', id, `Added security item "${title}"`);

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error('Create security finding error:', err);
    return NextResponse.json({ error: 'Failed to create security finding.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { id, title, category, severity, status, affected_asset, owner, due_date, remediation_plan, restricted_details } = body;

    if (!id) {
      return NextResponse.json({ error: 'Finding ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const now = nowUtc();

    await db.execute({
      sql: `UPDATE security_findings SET
            title = COALESCE(?, title),
            category = COALESCE(?, category),
            severity = COALESCE(?, severity),
            status = COALESCE(?, status),
            affected_asset = COALESCE(?, affected_asset),
            owner = COALESCE(?, owner),
            due_date = ?,
            remediation_plan = COALESCE(?, remediation_plan),
            restricted_details = COALESCE(?, restricted_details),
            updated_at = ?
            WHERE id = ?`,
      args: [
        title,
        category,
        severity,
        status,
        affected_asset,
        owner,
        due_date !== undefined ? due_date : null,
        remediation_plan,
        restricted_details,
        now,
        id,
      ],
    });

    await logAudit(auth.user!.id, auth.user!.email, 'UPDATE_SECURITY_FINDING', 'SECURITY', id, `Updated security item "${title || id}"`);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Update security finding error:', err);
    return NextResponse.json({ error: 'Failed to update security finding.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Security item ID is required.' }, { status: 400 });
  }

  const db = getDb();
  const findingRes = await db.execute({ sql: `SELECT title FROM security_findings WHERE id = ?`, args: [id] });
  const title = findingRes.rows[0]?.title || id;

  await db.execute({ sql: `DELETE FROM security_findings WHERE id = ?`, args: [id] });

  await logAudit(
    auth.user!.id,
    auth.user!.email,
    'DELETE_SECURITY_FINDING',
    'SECURITY',
    id,
    `Deleted security finding "${title}"`
  );

  return NextResponse.json({ success: true });
}

