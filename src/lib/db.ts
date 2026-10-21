import { createClient, Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

function getDatabaseConfig(): { url: string; authToken?: string } {
  const remoteUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.TURSO_URL ||
    process.env.LIBSQL_DATABASE_URL ||
    process.env.LIBSQL_URL;

  const authToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN;

  if (remoteUrl && (remoteUrl.startsWith('libsql://') || remoteUrl.startsWith('https://') || remoteUrl.startsWith('http://'))) {
    return {
      url: remoteUrl,
      authToken,
    };
  }

  const isVercel = Boolean(process.env.VERCEL);
  const dataDir = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // Ignore if directory cannot be created in read-only environment
    }
  }

  const dbPath = path.join(dataDir, 'gashtyar_it.db');

  // On Vercel, copy bundled pre-seeded DB to /tmp if it doesn't exist yet
  if (isVercel && !fs.existsSync(dbPath)) {
    const bundledDbPath = path.join(process.cwd(), 'data', 'gashtyar_it.db');
    if (fs.existsSync(bundledDbPath)) {
      try {
        fs.copyFileSync(bundledDbPath, dbPath);
      } catch (err) {
        console.warn('Could not copy bundled db to /tmp:', err);
      }
    }
  }

  return {
    url: `file:${dbPath.replace(/\\/g, '/')}`,
  };
}

let clientInstance: Client | null = null;

function sanitizeInArgs(args: any): any {
  if (Array.isArray(args)) {
    return args.map((v) => (v === undefined ? null : v));
  }
  if (args && typeof args === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(args)) {
      res[k] = v === undefined ? null : v;
    }
    return res;
  }
  return args;
}

export function getDb(): Client {
  if (!clientInstance) {
    const dbConfig = getDatabaseConfig();
    const rawClient = createClient(dbConfig);

    const origExecute = rawClient.execute.bind(rawClient);
    rawClient.execute = function (stmt: any) {
      if (stmt && typeof stmt === 'object' && stmt.args) {
        stmt = { ...stmt, args: sanitizeInArgs(stmt.args) };
      }
      return origExecute(stmt);
    };

    clientInstance = rawClient;
  }
  return clientInstance;
}

export async function initDb() {
  const db = getDb();

  // Execute schema creation in a single transaction or sequence
  await db.executeMultiple(`
    PRAGMA foreign_keys = ON;

    -- Users & invitations
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'MANAGER', 'VIEWER')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      department TEXT DEFAULT 'Operations',
      invited_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Verification challenges (Passwordless Email Verification Codes)
    CREATE TABLE IF NOT EXISTS verification_challenges (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      redirect_path TEXT DEFAULT '/',
      attempts INTEGER DEFAULT 0,
      used INTEGER DEFAULT 0,
      superseded INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      resend_cooldown_until TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    -- Active Sessions (Server sessions paired with per-tab context)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tab_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      absolute_expires_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    -- Systems tracked
    CREATE TABLE IF NOT EXISTS systems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPERATIONAL' CHECK(status IN ('OPERATIONAL', 'DEGRADED', 'UNAVAILABLE', 'MAINTENANCE')),
      sort_order INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      business_impact TEXT,
      investigation_stage TEXT,
      eta_text TEXT,
      eta_timestamp TEXT,
      eta_reason TEXT,
      last_updated_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Incidents
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      incident_ref TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
      priority TEXT NOT NULL CHECK(priority IN ('P1', 'P2', 'P3', 'P4')),
      business_impact TEXT,
      assigned_owner TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'INVESTIGATING', 'FIX_IN_PROGRESS', 'MONITORING', 'RESOLVED')),
      eta_date TEXT,
      eta_label TEXT DEFAULT 'Estimate',
      is_under_assessment INTEGER DEFAULT 0,
      next_update_due TEXT,
      resolution_summary TEXT,
      resolved_at TEXT,
      root_cause TEXT,
      preventive_actions TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Many-to-many incident to systems
    CREATE TABLE IF NOT EXISTS incident_systems (
      incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
      PRIMARY KEY (incident_id, system_id)
    );

    -- Incident timeline / history
    CREATE TABLE IF NOT EXISTS incident_timeline (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      stage TEXT NOT NULL,
      message TEXT NOT NULL,
      eta_change_reason TEXT,
      new_eta TEXT,
      created_at TEXT NOT NULL
    );

    -- Updates & New Features
    CREATE TABLE IF NOT EXISTS updates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      business_benefit TEXT,
      owner TEXT NOT NULL,
      update_type TEXT NOT NULL CHECK(update_type IN ('NEW_FEATURE', 'IMPROVEMENT', 'BUG_FIX', 'MAINTENANCE', 'GENERAL_ANNOUNCEMENT')),
      status TEXT NOT NULL CHECK(status IN ('PLANNED', 'IN_PROGRESS', 'TESTING', 'RELEASED')),
      publication_state TEXT NOT NULL DEFAULT 'DRAFT' CHECK(publication_state IN ('DRAFT', 'PUBLISHED')),
      notification_state TEXT NOT NULL DEFAULT 'NOT_SENT' CHECK(notification_state IN ('NOT_SENT', 'QUEUED', 'SENT')),
      target_date TEXT,
      release_date TEXT,
      version TEXT,
      technical_changes TEXT DEFAULT '',
      deployment_env TEXT DEFAULT 'Production',
      published_by_name TEXT,
      published_at TEXT,
      revision_count INTEGER DEFAULT 1,
      attachments TEXT DEFAULT '[]',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Many-to-many update to systems
    CREATE TABLE IF NOT EXISTS update_systems (
      update_id TEXT NOT NULL REFERENCES updates(id) ON DELETE CASCADE,
      system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
      PRIMARY KEY (update_id, system_id)
    );

    -- Comments & Discussion
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL CHECK(target_type IN ('SYSTEM', 'INCIDENT', 'UPDATE', 'INFRASTRUCTURE', 'SECURITY', 'GENERAL')),
      target_id TEXT NOT NULL,
      parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_edited INTEGER DEFAULT 0,
      is_request_update INTEGER DEFAULT 0,
      is_restricted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Comment mentions
    CREATE TABLE IF NOT EXISTS comment_mentions (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL
    );

    -- Infrastructure & Server assets
    CREATE TABLE IF NOT EXISTS server_assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      hosting_provider TEXT NOT NULL,
      owner TEXT NOT NULL,
      health_status TEXT NOT NULL CHECK(health_status IN ('HEALTHY', 'WARNING', 'CRITICAL', 'MANUAL_STATUS', 'STALE')),
      cpu_percent REAL,
      memory_percent REAL,
      disk_percent REAL,
      last_check_at TEXT,
      database_health TEXT DEFAULT 'NORMAL',
      last_backup_at TEXT,
      backup_result TEXT CHECK(backup_result IN ('SUCCESS', 'FAILED', 'IN_PROGRESS')),
      backup_schedule TEXT DEFAULT 'Daily at 02:00 Baghdad Time',
      backup_retention TEXT DEFAULT '30 Days encrypted off-site',
      last_restore_test_at TEXT,
      restore_outcome TEXT CHECK(restore_outcome IN ('VERIFIED', 'FAILED', 'PENDING')),
      upcoming_maintenance TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Cybersecurity findings & tasks
    CREATE TABLE IF NOT EXISTS security_findings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('ENDPOINT', 'MFA', 'VULNERABILITY', 'PATCH', 'CERT_DOMAIN', 'ACCESS_REVIEW', 'INCIDENT')),
      severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
      status TEXT NOT NULL CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED')),
      affected_asset TEXT NOT NULL,
      owner TEXT NOT NULL,
      due_date TEXT,
      remediation_plan TEXT,
      restricted_details TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Manual Email Notification records
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      summary_text TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('INCIDENT', 'UPDATE', 'DIGEST', 'SYSTEM_STATUS', 'GENERAL')),
      reference_id TEXT,
      system_name TEXT,
      status_badge TEXT,
      eta_text TEXT,
      sender_id TEXT NOT NULL REFERENCES users(id),
      sender_name TEXT NOT NULL,
      total_recipients INTEGER DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED')),
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL
    );

    -- Recipient level delivery log
    CREATE TABLE IF NOT EXISTS notification_recipients (
      id TEXT PRIMARY KEY,
      notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'PROVIDER_ACCEPTED', 'DELIVERED', 'FAILED', 'BOUNCED')),
      provider_response TEXT,
      attempted_at TEXT,
      delivered_at TEXT,
      retry_count INTEGER DEFAULT 0,
      error_message TEXT
    );

    -- System Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    -- App Settings (SMTP configuration, system metadata)
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_challenges_email ON verification_challenges(email);
    CREATE INDEX IF NOT EXISTS idx_systems_status ON systems(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_updates_pub ON updates(publication_state);
    CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_notif_recipients ON notification_recipients(notification_id);
  `);

  // Run safe column migrations for complete system upgrade
  await runSafeMigrations(db);
}

/**
 * Safely adds any missing columns across tables without dropping or altering existing user records
 */
async function runSafeMigrations(db: Client) {
  async function addCol(table: string, col: string, def: string) {
    try {
      const info = await db.execute(`PRAGMA table_info(${table})`);
      const exists = info.rows.some((r: any) => r.name === col);
      if (!exists) {
        await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      }
    } catch {
      // Ignore migration collision
    }
  }

  // 1. Systems columns
  await addCol('systems', 'logo_url', "TEXT DEFAULT ''");
  await addCol('systems', 'hosting_env', "TEXT DEFAULT 'Cloud VPS (Frankfurt)'");
  await addCol('systems', 'domain_names', "TEXT DEFAULT ''");
  await addCol('systems', 'tech_stack', "TEXT DEFAULT 'Next.js, Node.js, PostgreSQL, Redis, Nginx'");
  await addCol('systems', 'connected_integrations', "TEXT DEFAULT ''");
  await addCol('systems', 'responsible_team', "TEXT DEFAULT 'Engineering & Operations'");
  await addCol('systems', 'purpose', "TEXT DEFAULT ''");
  await addCol('systems', 'config_details', "TEXT DEFAULT ''");
  await addCol('systems', 'last_health_check_at', 'TEXT');
  await addCol('systems', 'health_check_type', "TEXT DEFAULT 'Manual Status Verification'");
  await addCol('systems', 'pending_tasks_count', 'INTEGER DEFAULT 0');

  // 2. Incidents columns
  await addCol('incidents', 'technical_notes', "TEXT DEFAULT ''");
  await addCol('incidents', 'actual_resolution_time', 'TEXT');
  await addCol('incidents', 'attachments', "TEXT DEFAULT '[]'");

  // 3. Updates columns
  await addCol('updates', 'technical_changes', "TEXT DEFAULT ''");
  await addCol('updates', 'deployment_env', "TEXT DEFAULT 'Production'");
  await addCol('updates', 'published_by_name', "TEXT DEFAULT 'Gahin Mayi'");
  await addCol('updates', 'published_at', 'TEXT');
  await addCol('updates', 'revision_count', 'INTEGER DEFAULT 1');
  await addCol('updates', 'attachments', "TEXT DEFAULT '[]'");

  // 4. Comments columns (Request Update from IT workflow)
  await addCol('comments', 'request_status', "TEXT DEFAULT 'OPEN'");
  await addCol('comments', 'it_response', 'TEXT');
  await addCol('comments', 'it_responded_at', 'TEXT');
  await addCol('comments', 'it_responder_name', 'TEXT');

  // 5. Server Assets columns
  await addCol('server_assets', 'environment', "TEXT DEFAULT 'Production'");
  await addCol('server_assets', 'uptime_percent', 'REAL DEFAULT 99.95');
  await addCol('server_assets', 'last_manual_verified_at', 'TEXT');
  await addCol('server_assets', 'verified_by', "TEXT DEFAULT 'Gahin Mayi'");

  // 6. Security Findings columns
  await addCol('security_findings', 'mfa_adoption_percent', 'REAL DEFAULT 92.5');
  await addCol('security_findings', 'failed_login_count', 'INTEGER DEFAULT 0');
  await addCol('security_findings', 'suspicious_activity_count', 'INTEGER DEFAULT 0');
  await addCol('security_findings', 'patch_status', "TEXT DEFAULT 'Up to date'");
  await addCol('security_findings', 'access_review_status', "TEXT DEFAULT 'Quarterly review completed'");

  // Backfill existing systems with rich enterprise details if purpose or hosting_env is empty
  try {
    const existingSystems = await db.execute(`SELECT id, slug, hosting_env, purpose FROM systems`);
    const systemDefaults: Record<string, any> = {
      'gate2hotels-b2b': {
        hosting_env: 'AWS Frankfurt (eu-central-1) & Cloudflare Enterprise CDN',
        domain_names: 'gate2hotels.com, b2b.gate2hotels.com, api.gate2hotels.com',
        tech_stack: 'Next.js 14, Node.js microservices, PostgreSQL (RDS Multi-AZ), Redis Cluster, Nginx',
        connected_integrations: 'Sabre SynXis, TravelgateX, Hotelbeds API, Stripe B2B, Wholesaler XML Gateways',
        responsible_team: 'Azad Al-Gashtyar (IT Lead) & Core Engine Devs',
        purpose: 'Enterprise B2B hotel bedbank and wholesale reservation gateway for corporate travel agencies.',
        config_details: '{\n  "cluster_nodes": 6,\n  "redis_cache_ttl": "300s",\n  "rate_limit": "2500 req/min",\n  "db_connections": 45,\n  "waf_status": "Active (Cloudflare Enterprise)",\n  "api_secret": "g2h_live_sec_99af************341c"\n}',
        health_check_type: 'Manual IT Manager Verification',
        pending_tasks_count: 0,
      },
      'ticketaat-flights': {
        hosting_env: 'Hetzner Cloud Dedicated (Nuremberg DC) & Upstream GDS VPN',
        domain_names: 'ticketaat.com, flights.ticketaat.com, api.ticketaat.com',
        tech_stack: 'React, Python FastAPI, Sabre Web Services, PostgreSQL, RabbitMQ, Docker Swarm',
        connected_integrations: 'Sabre GDS, Amadeus Web Services, IATA BSP Settlement, Iraqi Airways API',
        responsible_team: 'Azad Al-Gashtyar & Amenah Karim (Operations Lead)',
        purpose: 'Commercial flight search, GDS aggregation, fare rules calculator, and automated ticketing engine.',
        config_details: '{\n  "sabre_session_pool": 12,\n  "timeout_seconds": 8,\n  "amadeus_queue": "Active",\n  "bsp_link": "Connected",\n  "gds_access_key": "sbr_prod_tok_71b************89a"\n}',
        health_check_type: 'Manual Status Verification (Awaiting Failover)',
        pending_tasks_count: 1,
      },
      'hotel-extranet': {
        hosting_env: 'DigitalOcean Frankfurt Premium Droplets',
        domain_names: 'extranet.gashtyar.com, partner.gate2hotels.com',
        tech_stack: 'Vue.js 3, Laravel 10, MySQL 8, Redis, Tailwind CSS',
        connected_integrations: 'Gate2Hotels Core, Channel Manager Sync, SMS Gateway (Zain Iraq)',
        responsible_team: 'Azad Al-Gashtyar & Partner Integration Team',
        purpose: 'Direct hotelier portal for room rates, allotments, stopsale management, and direct contract promotions.',
        config_details: '{\n  "session_lifetime": "120m",\n  "two_factor_required": true,\n  "max_upload_size": "25MB",\n  "cron_frequency": "1m",\n  "jwt_secret": "ext_sec_key_44c************11d"\n}',
        health_check_type: 'Manual IT Manager Verification',
        pending_tasks_count: 0,
      },
      'channel-manager': {
        hosting_env: 'AWS Frankfurt EC2 C6i instances with high-throughput network',
        domain_names: 'cm.gashtyar.com, ota-sync.gate2hotels.com',
        tech_stack: 'Go (Golang 1.22), Redis Pub/Sub, Kafka, PostgreSQL, Docker',
        connected_integrations: 'Siteminder, RateGain, D-EDGE, Hotelbeds, Channex OTA Connect',
        responsible_team: 'Azad Al-Gashtyar (Architecture Lead)',
        purpose: 'Real-time two-way synchronization of inventory, ARI (Availability, Rates, Inventory) with 15+ international channel managers.',
        config_details: '{\n  "sync_interval": "Real-time Webhook & 15m polling",\n  "concurrent_workers": 32,\n  "kafka_retention": "72h",\n  "webhook_signing_key": "wh_sign_88e************99a"\n}',
        health_check_type: 'Manual IT Manager Verification',
        pending_tasks_count: 0,
      },
      'gashtyar-attendance': {
        hosting_env: 'Gashtyar Baghdad HQ On-Premise Server & Hybrid WireGuard VPN Tunnel',
        domain_names: 'attendance.internal.gashtyar.com (HQ LAN / VPN only)',
        tech_stack: 'Node.js, SQLite / PostgreSQL sync, ZKTeco Biometric SDK, React',
        connected_integrations: 'HQ Biometric Fingerprint Terminals, Erbil Branch Terminals, HR Payroll System',
        responsible_team: 'Azad Al-Gashtyar & HR Administration',
        purpose: 'Employee biometric attendance, daily check-in logs, leave approvals, and monthly timesheet processing.',
        config_details: '{\n  "biometric_devices": 4,\n  "sync_frequency": "Every 5 minutes",\n  "vpn_tunnel": "WireGuard Active",\n  "backup_destination": "Off-site Encrypted S3",\n  "terminal_auth_key": "zk_term_key_55a************22b"\n}',
        health_check_type: 'Manual IT Manager Verification',
        pending_tasks_count: 0,
      },
      'attendance-system': {
        hosting_env: 'Gashtyar Baghdad HQ On-Premise Server & Hybrid WireGuard VPN Tunnel',
        domain_names: 'attendance.internal.gashtyar.com (HQ LAN / VPN only)',
        tech_stack: 'Node.js, SQLite / PostgreSQL sync, ZKTeco Biometric SDK, React',
        connected_integrations: 'HQ Biometric Fingerprint Terminals, Erbil Branch Terminals, HR Payroll System',
        responsible_team: 'Azad Al-Gashtyar & HR Administration',
        purpose: 'Employee biometric attendance, daily check-in logs, leave approvals, and monthly timesheet processing.',
        config_details: '{\n  "biometric_devices": 4,\n  "sync_frequency": "Every 5 minutes",\n  "vpn_tunnel": "WireGuard Active",\n  "backup_destination": "Off-site Encrypted S3",\n  "terminal_auth_key": "zk_term_key_55a************22b"\n}',
        health_check_type: 'Manual IT Manager Verification',
        pending_tasks_count: 0,
      },
      'corporate-website': {
        hosting_env: 'Vercel Enterprise Edge Network & AWS S3 CDN Assets',
        domain_names: 'gashtyar.com, www.gashtyar.com, tourism.gashtyar.com',
        tech_stack: 'Next.js 15, React 19, Tailwind CSS, Sanity CMS, Cloudflare DNS & SSL',
        connected_integrations: 'WhatsApp Business API, Zoho CRM Lead Capture, Google Analytics 4, Meta Pixel',
        responsible_team: 'Azad Al-Gashtyar & Marketing Department',
        purpose: 'Official Gashtyar Travel & Tourism corporate portal, luxury tour packages, company profile, and branch locator.',
        config_details: '{\n  "edge_caching": "Global Edge Active",\n  "tls_version": "TLS 1.3 Strict",\n  "cms_webhook": "Connected",\n  "crm_api_token": "zh_crm_live_99d************88f"\n}',
        health_check_type: 'Manual IT Manager Verification',
        pending_tasks_count: 0,
      },
    };

    const now = new Date().toISOString();
    for (const row of existingSystems.rows as any[]) {
      const def = systemDefaults[row.slug];
      if (def && (!row.purpose || !row.domain_names)) {
        await db.execute({
          sql: `UPDATE systems SET
                hosting_env = COALESCE(NULLIF(hosting_env, ''), ?),
                domain_names = COALESCE(NULLIF(domain_names, ''), ?),
                tech_stack = COALESCE(NULLIF(tech_stack, ''), ?),
                connected_integrations = COALESCE(NULLIF(connected_integrations, ''), ?),
                responsible_team = COALESCE(NULLIF(responsible_team, ''), ?),
                purpose = COALESCE(NULLIF(purpose, ''), ?),
                config_details = COALESCE(NULLIF(config_details, ''), ?),
                health_check_type = COALESCE(NULLIF(health_check_type, ''), ?),
                last_health_check_at = COALESCE(last_health_check_at, ?),
                pending_tasks_count = COALESCE(pending_tasks_count, ?)
                WHERE id = ?`,
          args: [
            def.hosting_env,
            def.domain_names,
            def.tech_stack,
            def.connected_integrations,
            def.responsible_team,
            def.purpose,
            def.config_details,
            def.health_check_type,
            now,
            def.pending_tasks_count,
            row.id,
          ],
        });
      }
    }
  } catch (err) {
    console.error('System defaults backfill error:', err);
  }
}

