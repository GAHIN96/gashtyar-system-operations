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
  const statusFilter = req.nextUrl.searchParams.get('status');
  const systemFilter = req.nextUrl.searchParams.get('systemId');

  let query = `
    SELECT i.*,
      GROUP_CONCAT(s.name, ', ') as affected_systems_names,
      GROUP_CONCAT(s.id, ',') as affected_system_ids,
      (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'INCIDENT' AND c.target_id = i.id) as comment_count
    FROM incidents i
    LEFT JOIN incident_systems ins ON i.id = ins.incident_id
    LEFT JOIN systems s ON ins.system_id = s.id
    WHERE 1=1
  `;
  const args: (string | number)[] = [];

  if (statusFilter && statusFilter !== 'ALL') {
    if (statusFilter === 'ACTIVE') {
      query += ` AND i.status != 'RESOLVED'`;
    } else {
      query += ` AND i.status = ?`;
      args.push(statusFilter);
    }
  }

  if (systemFilter) {
    query += ` AND ins.system_id = ?`;
    args.push(systemFilter);
  }

  query += `
    GROUP BY i.id
    ORDER BY 
      CASE i.status WHEN 'RESOLVED' THEN 2 ELSE 1 END,
      CASE i.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
      i.reported_at DESC
  `;

  const result = await db.execute({ sql: query, args });

  // Fetch timeline for each incident
  const incidents = [];
  for (const row of result.rows) {
    const timelineRes = await db.execute({
      sql: `SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY created_at ASC`,
      args: [row.id as string],
    });
    incidents.push({
      ...row,
      timeline: timelineRes.rows,
    });
  }

  return NextResponse.json({ incidents });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      title,
      description,
      severity,
      priority,
      business_impact,
      assigned_owner,
      status,
      eta_date,
      eta_label,
      is_under_assessment,
      next_update_due,
      affected_system_ids, // array of system IDs
    } = body;

    if (!title || !severity || !priority || !assigned_owner || !affected_system_ids?.length) {
      return NextResponse.json(
        { error: 'Title, severity, priority, owner, and at least one affected system are required.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = nowUtc();
    const incidentId = `inc_${crypto.randomUUID().slice(0, 8)}`;

    // Generate readable incident reference (e.g. INC-2026-002)
    const countRes = await db.execute(`SELECT COUNT(*) as count FROM incidents`);
    const nextSeq = String(Number(countRes.rows[0].count || 0) + 1).padStart(3, '0');
    const incidentRef = `INC-${new Date().getFullYear()}-${nextSeq}`;

    await db.execute({
      sql: `INSERT INTO incidents 
            (id, incident_ref, title, description, severity, priority, business_impact, assigned_owner, reported_at, status, eta_date, eta_label, is_under_assessment, next_update_due, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        incidentId,
        incidentRef,
        title,
        description || '',
        severity,
        priority,
        business_impact || '',
        assigned_owner,
        now,
        status || 'OPEN',
        is_under_assessment ? null : eta_date || null,
        eta_label || 'Estimate',
        is_under_assessment ? 1 : 0,
        next_update_due || null,
        auth.user?.id || 'unknown',
        now,
        now,
      ],
    });

    // Link affected systems and update system operational statuses
    for (const sysId of affected_system_ids) {
      if (!sysId || typeof sysId !== 'string') continue;
      try {
        const sysExists = await db.execute({
          sql: `SELECT id FROM systems WHERE id = ?`,
          args: [sysId],
        });
        if (sysExists.rows.length > 0) {
          await db.execute({
            sql: `INSERT INTO incident_systems (incident_id, system_id) VALUES (?, ?)`,
            args: [incidentId, sysId],
          });

          const newSystemStatus = severity === 'CRITICAL' ? 'UNAVAILABLE' : 'DEGRADED';
          const etaDisplayText = is_under_assessment
            ? 'Under assessment'
            : eta_date
            ? `${eta_label || 'Estimate'}: ${eta_date}`
            : null;

          await db.execute({
            sql: `UPDATE systems SET 
                  status = ?, 
                  investigation_stage = ?,
                  eta_text = ?,
                  eta_timestamp = ?,
                  last_updated_by = ?,
                  updated_at = ?
                  WHERE id = ?`,
            args: [
              newSystemStatus,
              `Active Incident (${incidentRef}): ${title}`,
              etaDisplayText,
              is_under_assessment ? null : eta_date || null,
              auth.user?.name,
              now,
              sysId,
            ],
          });
        }
      } catch (err) {
        console.warn('Could not link system to incident:', err);
      }
    }

    // Insert initial timeline entry
    await db.execute({
      sql: `INSERT INTO incident_timeline (id, incident_id, author_id, author_name, stage, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        incidentId,
        auth.user?.id || 'unknown',
        auth.user?.name || 'Administrator',
        status || 'OPEN',
        `Incident reported with severity ${severity} (${priority}). Investigation initiated.`,
        now,
      ],
    });

    await logAudit(
      auth.user?.id || null,
      auth.user?.email || null,
      'CREATE_INCIDENT',
      'INCIDENT',
      incidentId,
      `Reported incident ${incidentRef}: "${title}"`
    );

    return NextResponse.json({ success: true, id: incidentId, incidentRef });
  } catch (err: unknown) {
    console.error('Create incident error:', err);
    return NextResponse.json({ error: 'Failed to create incident.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      id,
      title,
      description,
      severity,
      priority,
      business_impact,
      assigned_owner,
      status,
      eta_date,
      eta_label,
      is_under_assessment,
      next_update_due,
      resolution_summary,
      root_cause,
      preventive_actions,
      eta_change_reason,
      timeline_update_message,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Incident ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const now = nowUtc();

    // Fetch existing incident to detect ETA or status change
    const prevRes = await db.execute({ sql: `SELECT * FROM incidents WHERE id = ?`, args: [id] });
    if (prevRes.rows.length === 0) {
      return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
    }
    const prev = prevRes.rows[0];

    const isResolving = status === 'RESOLVED' && prev.status !== 'RESOLVED';
    const resolvedAt = isResolving ? now : prev.resolved_at;

    await db.execute({
      sql: `UPDATE incidents SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            severity = COALESCE(?, severity),
            priority = COALESCE(?, priority),
            business_impact = COALESCE(?, business_impact),
            assigned_owner = COALESCE(?, assigned_owner),
            status = COALESCE(?, status),
            eta_date = ?,
            eta_label = COALESCE(?, eta_label),
            is_under_assessment = ?,
            next_update_due = ?,
            technical_notes = COALESCE(?, technical_notes),
            actual_resolution_time = COALESCE(?, actual_resolution_time),
            attachments = COALESCE(?, attachments),
            resolution_summary = COALESCE(?, resolution_summary),
            resolved_at = ?,
            root_cause = COALESCE(?, root_cause),
            preventive_actions = COALESCE(?, preventive_actions),
            updated_at = ?
            WHERE id = ?`,
      args: [
        title,
        description,
        severity,
        priority,
        business_impact,
        assigned_owner,
        status,
        is_under_assessment ? null : eta_date !== undefined ? eta_date : prev.eta_date,
        eta_label,
        is_under_assessment !== undefined ? (is_under_assessment ? 1 : 0) : prev.is_under_assessment,
        next_update_due !== undefined ? next_update_due : prev.next_update_due,
        body.technical_notes,
        body.actual_resolution_time || (isResolving ? now : prev.actual_resolution_time),
        body.attachments ? (typeof body.attachments === 'string' ? body.attachments : JSON.stringify(body.attachments)) : null,
        resolution_summary,
        resolvedAt,
        root_cause,
        preventive_actions,
        now,
        id,
      ],
    });

    // Record timeline entry if status changed, ETA changed, or custom update provided
    const etaChanged = prev.eta_date !== eta_date && eta_date !== undefined;
    const stageChanged = prev.status !== status && status !== undefined;

    if (stageChanged || etaChanged || timeline_update_message) {
      const message =
        timeline_update_message ||
        (isResolving
          ? `Incident resolved. ${resolution_summary || 'All affected systems restored.'}`
          : stageChanged
          ? `Status transitioned to ${status}.`
          : etaChanged
          ? `Estimated resolution updated to ${eta_date}. Reason: ${eta_change_reason || 'Timeline revision'}`
          : 'Incident updated');

      await db.execute({
        sql: `INSERT INTO incident_timeline (id, incident_id, author_id, author_name, stage, message, eta_change_reason, new_eta, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          id,
          auth.user?.id || 'unknown',
          auth.user?.name || 'Administrator',
          status || (prev.status as string),
          message,
          etaChanged ? eta_change_reason || null : null,
          etaChanged ? (eta_date as string) || null : null,
          now,
        ],
      });
    }

    // Critical Requirement:
    // "Resolving one incident must not incorrectly mark the system healthy if another incident still affects it."
    const linkedSystemsRes = await db.execute({
      sql: `SELECT system_id FROM incident_systems WHERE incident_id = ?`,
      args: [id],
    });

    for (const row of linkedSystemsRes.rows) {
      const sysId = row.system_id as string;

      // Check if ANY other active incidents remain for this system
      const remainingIncidentsRes = await db.execute({
        sql: `SELECT i.id, i.severity, i.priority, i.incident_ref, i.title, i.eta_date, i.is_under_assessment
              FROM incidents i
              JOIN incident_systems ins ON i.id = ins.incident_id
              WHERE ins.system_id = ? AND i.status != 'RESOLVED' AND i.id != ?`,
        args: [sysId, isResolving ? id : 'none'],
      });

      if (remainingIncidentsRes.rows.length === 0) {
        // System has zero other active incidents -> Return to OPERATIONAL
        await db.execute({
          sql: `UPDATE systems SET 
                status = 'OPERATIONAL', 
                investigation_stage = 'Normal operating parameters. All services healthy.',
                eta_text = NULL,
                eta_timestamp = NULL,
                last_updated_by = ?,
                updated_at = ?
                WHERE id = ?`,
          args: [auth.user?.name || 'Administrator', now, sysId],
        });
      } else {
        // System still has other active incidents! Determine appropriate status
        const highestSeverity = remainingIncidentsRes.rows.some((i) => i.severity === 'CRITICAL')
          ? 'UNAVAILABLE'
          : 'DEGRADED';
        const topInc = remainingIncidentsRes.rows[0];

        await db.execute({
          sql: `UPDATE systems SET 
                status = ?, 
                investigation_stage = ?,
                eta_text = ?,
                last_updated_by = ?,
                updated_at = ?
                WHERE id = ?`,
          args: [
            highestSeverity,
            `Active Incident (${topInc.incident_ref}): ${topInc.title}`,
            topInc.is_under_assessment ? 'Under assessment' : (topInc.eta_date as string) || null,
            auth.user?.name || 'Administrator',
            now,
            sysId,
          ],
        });
      }
    }

    await logAudit(
      auth.user?.id || null,
      auth.user?.email || null,
      'UPDATE_INCIDENT',
      'INCIDENT',
      id,
      `Updated incident ${prev.incident_ref} status to ${status || prev.status}`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Update incident error:', err);
    return NextResponse.json({ error: 'Failed to update incident.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Incident ID is required.' }, { status: 400 });
  }

  const db = getDb();
  const incRes = await db.execute({ sql: `SELECT incident_ref, title FROM incidents WHERE id = ?`, args: [id] });
  if (incRes.rows.length === 0) {
    return NextResponse.json({ error: 'Incident not found.' }, { status: 404 });
  }
  const inc = incRes.rows[0];

  // Find linked systems
  const linkedSys = await db.execute({ sql: `SELECT system_id FROM incident_systems WHERE incident_id = ?`, args: [id] });

  // Delete incident links and incident
  await db.execute({ sql: `DELETE FROM incident_systems WHERE incident_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM incident_timeline WHERE incident_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM incidents WHERE id = ?`, args: [id] });

  // Refresh linked systems status
  const now = nowUtc();
  for (const row of linkedSys.rows) {
    const sysId = row.system_id as string;
    const remaining = await db.execute({
      sql: `SELECT inc.id, inc.severity FROM incident_systems isys
            JOIN incidents inc ON inc.id = isys.incident_id
            WHERE isys.system_id = ? AND inc.status NOT IN ('RESOLVED', 'CLOSED')`,
      args: [sysId],
    });

    if (remaining.rows.length === 0) {
      await db.execute({
        sql: `UPDATE systems SET status = 'OPERATIONAL', investigation_stage = 'Operational and monitored', eta_text = NULL, updated_at = ? WHERE id = ?`,
        args: [now, sysId],
      });
    }
  }

  await logAudit(
    auth.user!.id,
    auth.user!.email,
    'DELETE_INCIDENT',
    'INCIDENT',
    id,
    `Deleted incident ${inc.incident_ref} ("${inc.title}")`
  );

  return NextResponse.json({ success: true });
}

