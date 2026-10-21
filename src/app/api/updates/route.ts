import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { nowUtc } from '@/lib/time';
import { logAudit } from '@/lib/auth';
import { queueNotification, EmailRecipient } from '@/lib/email';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  await initDb();
  const db = getDb();
  const isAdmin = auth.user?.role === 'ADMIN';

  const typeFilter = req.nextUrl.searchParams.get('type');
  const systemFilter = req.nextUrl.searchParams.get('systemId');
  const search = req.nextUrl.searchParams.get('search');

  let query = `
    SELECT u.*,
      GROUP_CONCAT(s.name, ', ') as systems_names,
      GROUP_CONCAT(s.id, ',') as system_ids,
      (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'UPDATE' AND c.target_id = u.id) as comment_count
    FROM updates u
    LEFT JOIN update_systems us ON u.id = us.update_id
    LEFT JOIN systems s ON us.system_id = s.id
    WHERE 1=1
  `;
  const args: (string | number)[] = [];

  // Non-admins can ONLY view published updates!
  if (!isAdmin) {
    query += ` AND u.publication_state = 'PUBLISHED'`;
  }

  if (typeFilter && typeFilter !== 'ALL') {
    query += ` AND u.update_type = ?`;
    args.push(typeFilter);
  }

  if (systemFilter) {
    query += ` AND us.system_id = ?`;
    args.push(systemFilter);
  }

  if (search) {
    query += ` AND (u.title LIKE ? OR u.description LIKE ? OR u.business_benefit LIKE ?)`;
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += `
    GROUP BY u.id
    ORDER BY 
      CASE u.status WHEN 'RELEASED' THEN 2 ELSE 1 END,
      COALESCE(u.release_date, u.target_date, u.created_at) DESC
  `;

  const result = await db.execute({ sql: query, args });

  return NextResponse.json({ updates: result.rows });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      title,
      description,
      business_benefit,
      owner,
      update_type,
      status,
      publication_state, // 'DRAFT' or 'PUBLISHED'
      target_date,
      release_date,
      version,
      system_ids, // array of system IDs
      sendNotification, // boolean: "Publish & send email"
      notificationPayload, // recipient list, custom subject/summary
    } = body;

    if (!title || !description || !owner || !update_type || !status) {
      return NextResponse.json(
        { error: 'Title, description, owner, type, and status are required.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = nowUtc();
    const updateId = `upd_${crypto.randomUUID().slice(0, 8)}`;
    const finalPubState = publication_state || 'DRAFT';

    const technicalChanges = body.technical_changes || '';
    const deploymentEnv = body.deployment_env || 'Production';
    const publishedAt = finalPubState === 'PUBLISHED' ? now : null;
    const publishedByName = finalPubState === 'PUBLISHED' ? auth.user!.name : null;
    const attachments = body.attachments ? (typeof body.attachments === 'string' ? body.attachments : JSON.stringify(body.attachments)) : '[]';

    await db.execute({
      sql: `INSERT INTO updates 
            (id, title, description, business_benefit, owner, update_type, status, publication_state, notification_state, target_date, release_date, version, technical_changes, deployment_env, published_by_name, published_at, revision_count, attachments, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NOT_SENT', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      args: [
        updateId,
        title,
        description,
        business_benefit || '',
        owner,
        update_type,
        status,
        finalPubState,
        target_date || null,
        status === 'RELEASED' ? release_date || now : null,
        version || null,
        technicalChanges,
        deploymentEnv,
        publishedByName,
        publishedAt,
        attachments,
        auth.user?.id || 'unknown',
        now,
        now,
      ],
    });

    // Link systems safely (only insert if system exists in systems table)
    if (system_ids && Array.isArray(system_ids)) {
      for (const sysId of system_ids) {
        if (!sysId || typeof sysId !== 'string') continue;
        try {
          const sysExists = await db.execute({
            sql: `SELECT id FROM systems WHERE id = ?`,
            args: [sysId],
          });
          if (sysExists.rows.length > 0) {
            await db.execute({
              sql: `INSERT INTO update_systems (update_id, system_id) VALUES (?, ?)`,
              args: [updateId, sysId],
            });
          }
        } catch (err) {
          console.warn('Could not link system to update:', err);
        }
      }
    }

    await logAudit(
      auth.user?.id || null,
      auth.user?.email || null,
      'CREATE_UPDATE',
      'UPDATE',
      updateId,
      `Created update "${title}" with state ${finalPubState}`
    );

    // CRITICAL REQUIREMENT:
    // Saving or editing information must NEVER automatically send an update email.
    // Only send if explicitly selected "Publish & send email"
    let notifQueued = false;
    if (sendNotification && finalPubState === 'PUBLISHED' && notificationPayload) {
      const recipients: EmailRecipient[] = notificationPayload.recipients || [];
      if (recipients.length > 0) {
        await queueNotification({
          subject: notificationPayload.subject || `[Update] ${title}`,
          summaryText: notificationPayload.summaryText || description,
          contentType: 'UPDATE',
          referenceId: updateId,
          systemName: notificationPayload.systemName || 'Gashtyar Systems',
          statusBadge: status,
          senderId: auth.user!.id,
          senderName: auth.user!.name,
          recipients,
          idempotencyKey: notificationPayload.idempotencyKey,
          targetUrlPath: `/?tab=updates&highlight=${updateId}`,
        });

        await db.execute({
          sql: `UPDATE updates SET notification_state = 'SENT' WHERE id = ?`,
          args: [updateId],
        });
        notifQueued = true;
      }
    }

    return NextResponse.json({ success: true, id: updateId, notificationQueued: notifQueued });
  } catch (err: unknown) {
    console.error('Create update error:', err);
    return NextResponse.json({ error: 'Failed to create update.' }, { status: 500 });
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
      business_benefit,
      owner,
      update_type,
      status,
      publication_state,
      target_date,
      release_date,
      version,
      system_ids,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Update ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const now = nowUtc();

    await db.execute({
      sql: `UPDATE updates SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            business_benefit = COALESCE(?, business_benefit),
            owner = COALESCE(?, owner),
            update_type = COALESCE(?, update_type),
            status = COALESCE(?, status),
            publication_state = COALESCE(?, publication_state),
            technical_changes = COALESCE(?, technical_changes),
            deployment_env = COALESCE(?, deployment_env),
            published_by_name = CASE WHEN publication_state = 'PUBLISHED' AND published_by_name IS NULL THEN ? ELSE published_by_name END,
            published_at = CASE WHEN publication_state = 'PUBLISHED' AND published_at IS NULL THEN ? ELSE published_at END,
            revision_count = COALESCE(revision_count, 1) + 1,
            target_date = ?,
            release_date = ?,
            version = ?,
            updated_at = ?
            WHERE id = ?`,
      args: [
        title,
        description,
        business_benefit,
        owner,
        update_type,
        status,
        publication_state,
        body.technical_changes,
        body.deployment_env,
        auth.user!.name,
        now,
        target_date !== undefined ? target_date : null,
        release_date !== undefined ? release_date : null,
        version !== undefined ? version : null,
        now,
        id,
      ],
    });

    // Update system links if provided
    if (system_ids && Array.isArray(system_ids)) {
      await db.execute({ sql: `DELETE FROM update_systems WHERE update_id = ?`, args: [id] });
      for (const sysId of system_ids) {
        await db.execute({
          sql: `INSERT INTO update_systems (update_id, system_id) VALUES (?, ?)`,
          args: [id, sysId],
        });
      }
    }

    // Critical rule: "Later edits must not resend emails automatically."
    // Zero emails sent here.

    await logAudit(
      auth.user?.id || null,
      auth.user?.email || null,
      'UPDATE_RELEASE',
      'UPDATE',
      id,
      `Edited update "${title || id}" without sending emails`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Update release error:', err);
    return NextResponse.json({ error: 'Failed to edit update.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Update ID is required.' }, { status: 400 });
  }

  const db = getDb();
  const updRes = await db.execute({ sql: `SELECT title FROM updates WHERE id = ?`, args: [id] });
  const title = updRes.rows[0]?.title || id;

  await db.execute({ sql: `DELETE FROM update_systems WHERE update_id = ?`, args: [id] });
  await db.execute({ sql: `DELETE FROM updates WHERE id = ?`, args: [id] });

  await logAudit(
    auth.user!.id,
    auth.user!.email,
    'DELETE_RELEASE',
    'UPDATE',
    id,
    `Deleted release/update "${title}"`
  );

  return NextResponse.json({ success: true });
}

