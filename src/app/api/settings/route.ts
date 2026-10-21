import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { getSmtpConfig } from '@/lib/email';
import { nowUtc } from '@/lib/time';
import { logAudit } from '@/lib/auth';
import nodemailer from 'nodemailer';

export async function GET(req: NextRequest) {
  // Allow all authenticated users (Managers & Admins) to view settings in read-only mode
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const config = await getSmtpConfig();
  const isAdmin = auth.user?.role === 'ADMIN';

  await initDb();
  const db = getDb();

  const settingsRes = await db.execute(`SELECT * FROM app_settings`);
  const settingsMap: Record<string, string> = {};
  for (const row of settingsRes.rows) {
    settingsMap[row.key as string] = row.value as string;
  }

  return NextResponse.json({
    isAdmin,
    company: {
      name: settingsMap['company_name'] || 'Gashtyar Travel & Tourism LLC',
      hq: settingsMap['company_hq'] || 'Baghdad, Al-Mansour, District 602, Iraq',
      timezone: 'Asia/Baghdad (UTC+03:00)',
      primaryContact: settingsMap['company_it_contact'] || 'it.admin@gashtyar.com',
      portalVersion: 'v2.4.0-enterprise',
    },
    smtp: {
      host: config.host || '',
      port: config.port || 587,
      user: config.user || '',
      hasPass: Boolean(config.pass),
      from: config.from,
      secure: config.secure,
      isConfigured: config.isConfigured,
    },
    securityPolicies: {
      sessionTimeoutMinutes: 15,
      maxSessionHours: 8,
      twoFactorMethod: 'Email 6-digit cryptographic verification challenge',
      authCodeExpiryMinutes: 10,
      ipTrackingEnabled: true,
      auditLogRetentionDays: 365,
    },
    systemCategories: [
      'Wholesale Booking Engine',
      'Flight Distribution & GDS',
      'Partner Portal',
      'Integration Engine',
      'Internal Operations',
      'Public Presence',
    ],
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser(req, 'ADMIN');
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const { host, port, user, pass, from, secure, testOnly, companyName, companyHq, itContact } = body;

    await initDb();
    const db = getDb();

    // If test requested, verify credentials with nodemailer
    if (testOnly) {
      if (!host || !user || !pass) {
        return NextResponse.json({ error: 'Host, user, and password are required to test.' }, { status: 400 });
      }

      try {
        const testTransport = nodemailer.createTransport({
          host,
          port: Number(port) || 587,
          secure: secure === true || Number(port) === 465,
          auth: { user, pass },
        });

        await testTransport.verify();
        return NextResponse.json({ success: true, message: 'SMTP connection verified successfully!' });
      } catch (testErr: unknown) {
        const message = testErr instanceof Error ? testErr.message : String(testErr);
        return NextResponse.json({ success: false, error: `SMTP Verification failed: ${message}` }, { status: 400 });
      }
    }

    // Save settings into app_settings table
    const now = nowUtc();
    const saveSetting = async (key: string, value: string) => {
      await db.execute({
        sql: `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [key, value, now],
      });
    };

    if (host !== undefined) await saveSetting('smtp_host', host);
    if (port !== undefined) await saveSetting('smtp_port', String(port));
    if (user !== undefined) await saveSetting('smtp_user', user);
    if (pass !== undefined && pass !== '') await saveSetting('smtp_pass', pass);
    if (from !== undefined) await saveSetting('smtp_from', from);
    if (secure !== undefined) await saveSetting('smtp_secure', secure ? 'true' : 'false');
    if (companyName !== undefined) await saveSetting('company_name', companyName);
    if (companyHq !== undefined) await saveSetting('company_hq', companyHq);
    if (itContact !== undefined) await saveSetting('company_it_contact', itContact);

    await logAudit(
      auth.user!.id,
      auth.user!.email,
      'UPDATE_SETTINGS',
      'SETTINGS',
      'system_config',
      `Updated platform configuration settings`
    );

    return NextResponse.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err: unknown) {
    console.error('Save settings error:', err);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
