import { getDb, initDb } from './db';
import { nowUtc } from './time';

/**
 * Clean Production Seeder:
 * Ensures only the primary admin and manager accounts exist,
 * along with the verified Resend SMTP settings.
 * No mock systems, mock incidents, mock updates, or mock comments are created,
 * allowing the user to configure all systems and updates from scratch.
 */
export async function seedDatabase() {
  await initDb();
  const db = getDb();
  const now = nowUtc();

  // 1. Ensure Super Admin Account
  const adminRes = await db.execute({
    sql: `SELECT id FROM users WHERE email = ?`,
    args: ['it@gate2hotels.co'],
  });

  if (adminRes.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, status, department, invited_by, created_at, updated_at)
            VALUES ('usr_admin_1', 'it@gate2hotels.co', 'IT Manager', 'ADMIN', 'ACTIVE', 'IT & Infrastructure', 'System Bootstrap', ?, ?)`,
      args: [now, now],
    });
  }

  // 2. Ensure Management Test Account
  const mgrRes = await db.execute({
    sql: `SELECT id FROM users WHERE email = ?`,
    args: ['almaeegahin@gmail.com'],
  });

  if (mgrRes.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, status, department, invited_by, created_at, updated_at)
            VALUES ('usr_mgr_test', 'almaeegahin@gmail.com', 'Operations Manager', 'MANAGER', 'ACTIVE', 'Operations Management', 'System Bootstrap', ?, ?)`,
      args: [now, now],
    });
  }

  // 3. Ensure Verified Resend SMTP Settings
  const smtpRows = [
    { key: 'company_it_contact', value: 'it@gate2hotels.co' },
    { key: 'smtp_host', value: 'smtp.resend.com' },
    { key: 'smtp_port', value: '465' },
    { key: 'smtp_user', value: 'resend' },
    { key: 'smtp_pass', value: process.env.SMTP_PASS || '' },
    { key: 'smtp_from', value: process.env.SMTP_FROM || 'Gashtyar IT Operations <it@monitor.gashtyartravel.com>' },
    { key: 'smtp_secure', value: 'true' },
  ];

  for (const s of smtpRows) {
    const exists = await db.execute({
      sql: `SELECT key FROM app_settings WHERE key = ?`,
      args: [s.key],
    });
    if (exists.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
        args: [s.key, s.value, now],
      });
    }
  }
}
