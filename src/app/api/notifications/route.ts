import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { queueNotification, getSmtpConfig } from '@/lib/email';

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  await initDb();
  const db = getDb();
  const isAdmin = auth.user?.role === 'ADMIN';

  // Fetch all notifications with recipient status breakdown
  const notifsRes = await db.execute(`
    SELECT n.*,
      (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.status = 'PROVIDER_ACCEPTED') as accepted_count,
      (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.status = 'FAILED') as failed_count,
      (SELECT COUNT(*) FROM notification_recipients nr WHERE nr.notification_id = n.id AND nr.status = 'QUEUED') as queued_count
    FROM notifications n
    ORDER BY n.created_at DESC
  `);

  // Fetch recipients for detailed delivery drawer
  const recipientsRes = await db.execute(`
    SELECT nr.*, n.subject as notification_subject
    FROM notification_recipients nr
    JOIN notifications n ON nr.notification_id = n.id
    ORDER BY nr.attempted_at DESC, nr.email ASC
    LIMIT 100
  `);

  const smtpConfig = await getSmtpConfig();

  return NextResponse.json({
    isAdmin,
    notifications: notifsRes.rows,
    recentDeliveries: recipientsRes.rows,
    smtpConfigured: smtpConfig.isConfigured,
    smtpDetails: {
      host: smtpConfig.host || 'Not set',
      port: smtpConfig.port,
      from: smtpConfig.from,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const {
      subject,
      summaryText,
      contentType,
      referenceId,
      systemName,
      statusBadge,
      etaText,
      recipients, // array of { userId, email, name }
      idempotencyKey,
      targetUrlPath,
    } = body;

    if (!subject || !summaryText || !recipients?.length) {
      return NextResponse.json(
        { error: 'Subject, summary text, and at least one recipient are required.' },
        { status: 400 }
      );
    }

    const result = await queueNotification({
      subject,
      summaryText,
      contentType: contentType || 'UPDATE',
      referenceId,
      systemName,
      statusBadge,
      etaText,
      senderId: auth.user!.id,
      senderName: auth.user!.name,
      recipients,
      idempotencyKey,
      targetUrlPath: targetUrlPath || '/',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to queue notification.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, notificationId: result.notificationId });
  } catch (err: unknown) {
    console.error('Queue notification error:', err);
    return NextResponse.json({ error: 'Failed to queue notification.' }, { status: 500 });
  }
}
