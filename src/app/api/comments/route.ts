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
  const targetType = req.nextUrl.searchParams.get('targetType');
  const targetId = req.nextUrl.searchParams.get('targetId');

  let sql = `
    SELECT c.*, u.name as author_display_name, u.role as author_actual_role, u.email as author_email
    FROM comments c
    JOIN users u ON c.author_id = u.id
    WHERE 1=1
  `;
  const args: (string | number)[] = [];

  if (targetType) {
    sql += ` AND c.target_type = ?`;
    args.push(targetType);
  }

  if (targetId) {
    sql += ` AND c.target_id = ?`;
    args.push(targetId);
  }

  // Security check: non-admins cannot see restricted discussion
  if (auth.user?.role !== 'ADMIN') {
    sql += ` AND c.is_restricted = 0`;
  }

  sql += ` ORDER BY c.created_at ASC`;

  const result = await db.execute({ sql, args });

  return NextResponse.json({ comments: result.rows });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'MANAGER'); // Managers & Admins can comment
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { target_type, target_id, parent_id, content, is_request_update, is_restricted } = body;

    if (!target_type || !target_id || !content || !content.trim()) {
      return NextResponse.json({ error: 'Target type, target ID, and content are required.' }, { status: 400 });
    }

    const db = getDb();
    const commentId = `cmt_${crypto.randomUUID().slice(0, 8)}`;
    const now = nowUtc();

    await db.execute({
      sql: `INSERT INTO comments 
            (id, target_type, target_id, parent_id, author_id, author_name, author_role, content, is_edited, is_request_update, is_restricted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      args: [
        commentId,
        target_type,
        target_id,
        parent_id || null,
        auth.user!.id,
        auth.user!.name,
        auth.user!.role,
        content.trim(),
        is_request_update ? 1 : 0,
        is_restricted && auth.user!.role === 'ADMIN' ? 1 : 0,
        now,
        now,
      ],
    });

    // Extract @mentions and record
    const mentionMatches = content.match(/@([\w.-]+)/g);
    if (mentionMatches) {
      for (const m of mentionMatches) {
        const username = m.replace('@', '').toLowerCase();
        const userRes = await db.execute({
          sql: `SELECT id, email FROM users WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? LIMIT 1`,
          args: [`%${username}%`, `%${username}%`],
        });
        if (userRes.rows.length > 0) {
          await db.execute({
            sql: `INSERT INTO comment_mentions (id, comment_id, user_id, user_email) VALUES (?, ?, ?, ?)`,
            args: [crypto.randomUUID(), commentId, userRes.rows[0].id, userRes.rows[0].email],
          });
        }
      }
    }

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'POST_COMMENT',
      'COMMENT',
      commentId,
      `Posted comment on ${target_type} ${target_id}${is_request_update ? ' (Requested Update)' : ''}`
    );

    return NextResponse.json({ success: true, id: commentId });
  } catch (err: unknown) {
    console.error('Post comment error:', err);
    return NextResponse.json({ error: 'Failed to post comment.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'MANAGER');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { id, content } = body;

    if (!id || !content || !content.trim()) {
      return NextResponse.json({ error: 'Comment ID and content are required.' }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.execute({ sql: `SELECT author_id FROM comments WHERE id = ?`, args: [id] });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    // Only author or admin can edit
    if (existing.rows[0].author_id !== auth.user!.id && auth.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own comments.' }, { status: 403 });
    }

    const now = nowUtc();
    await db.execute({
      sql: `UPDATE comments SET content = ?, is_edited = 1, updated_at = ? WHERE id = ?`,
      args: [content.trim(), now, id],
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Edit comment error:', err);
    return NextResponse.json({ error: 'Failed to edit comment.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'MANAGER');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Comment ID is required.' }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.execute({ sql: `SELECT author_id FROM comments WHERE id = ?`, args: [id] });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    // Only author or admin can delete
    if (existing.rows[0].author_id !== auth.user!.id && auth.user!.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own comments.' }, { status: 403 });
    }

    await db.execute({ sql: `DELETE FROM comments WHERE id = ?`, args: [id] });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete comment error:', err);
    return NextResponse.json({ error: 'Failed to delete comment.' }, { status: 500 });
  }
}
