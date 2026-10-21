import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { retryFailedNotification } from '@/lib/email';
import { logAudit } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await context.params;

  try {
    const result = await retryFailedNotification(id);

    await logAudit(
      auth.user?.id || null,
      auth.user?.email || null,
      'RETRY_NOTIFICATION',
      'NOTIFICATION',
      id,
      `Retried ${result.retriedCount} failed recipient deliveries for notification ${id}`
    );

    return NextResponse.json({ success: true, retriedCount: result.retriedCount });
  } catch (err: unknown) {
    console.error('Retry notification error:', err);
    return NextResponse.json({ error: 'Failed to retry notification.' }, { status: 500 });
  }
}
