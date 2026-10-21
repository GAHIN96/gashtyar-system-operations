import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { nowUtc } from '@/lib/time';
import { logAudit } from '@/lib/auth';

/**
 * Endpoint for IT Manager to reply to a Management Update Request
 * and update the request status (ACKNOWLEDGED, ANSWERED, RESOLVED).
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { comment_id, it_response, request_status } = body;

    if (!comment_id || !it_response?.trim()) {
      return NextResponse.json({ error: 'Comment ID and IT response text are required.' }, { status: 400 });
    }

    await initDb();
    const db = getDb();
    const now = nowUtc();

    const existing = await db.execute({
      sql: `SELECT id, target_type, target_id, is_request_update FROM comments WHERE id = ?`,
      args: [comment_id],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found.' }, { status: 404 });
    }

    const validStatus = ['ACKNOWLEDGED', 'ANSWERED', 'RESOLVED'].includes(request_status)
      ? request_status
      : 'ANSWERED';

    await db.execute({
      sql: `UPDATE comments SET
            it_response = ?,
            it_responded_at = ?,
            it_responder_name = ?,
            request_status = ?,
            updated_at = ?
            WHERE id = ?`,
      args: [it_response.trim(), now, auth.user!.name, validStatus, now, comment_id],
    });

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'RESPOND_MANAGEMENT_REQUEST',
      'COMMENT',
      comment_id,
      `IT Manager responded to management request (Status: ${validStatus})`
    );

    return NextResponse.json({ success: true, status: validStatus });
  } catch (err: unknown) {
    console.error('IT respond error:', err);
    return NextResponse.json({ error: 'Failed to record IT response.' }, { status: 500 });
  }
}
