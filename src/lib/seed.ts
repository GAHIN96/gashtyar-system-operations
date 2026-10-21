import { getDb, initDb } from './db';
import { nowUtc } from './time';
import crypto from 'crypto';

export async function seedDatabase() {
  await initDb();
  const db = getDb();

  // Check if already seeded
  const userCount = await db.execute(`SELECT COUNT(*) as count FROM users`);
  if (Number(userCount.rows[0].count) > 0) {
    return;
  }

  console.log('--- Seeding Gashtyar IT Operations Database ---');
  const now = nowUtc();

  // 1. Seed Users
  const users = [
    {
      id: 'usr_admin_1',
      email: 'it@gate2hotels.co',
      name: 'Gahin Mayi (IT Manager)',
      role: 'ADMIN',
      department: 'IT & Infrastructure',
    },
    {
      id: 'usr_mgr_test',
      email: 'almaeegahin@gmail.com',
      name: 'Gahin (Manager Test)',
      role: 'MANAGER',
      department: 'Operations Management',
    },
    {
      id: 'usr_mgr_1',
      email: 'ceo@gashtyar.com',
      name: 'Hersh Ahmed',
      role: 'MANAGER',
      department: 'Executive Management',
    },
    {
      id: 'usr_mgr_2',
      email: 'ops.manager@gashtyar.com',
      name: 'Amenah Karim',
      role: 'MANAGER',
      department: 'Operations',
    },
    {
      id: 'usr_mgr_3',
      email: 'commercial.head@gashtyar.com',
      name: 'Marwan Salah',
      role: 'MANAGER',
      department: 'Commercial & Partnerships',
    },
    {
      id: 'usr_view_1',
      email: 'auditor@gashtyar.com',
      name: 'Maryam Zaki',
      role: 'VIEWER',
      department: 'Internal Audit',
    },
  ];

  for (const u of users) {
    await db.execute({
      sql: `INSERT INTO users (id, email, name, role, status, department, invited_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'ACTIVE', ?, 'System Bootstrap', ?, ?)`,
      args: [u.id, u.email, u.name, u.role, u.department, now, now],
    });
  }

  // 2. Seed Initial 6 Configurable Systems
  const systems = [
    {
      id: 'sys_gate2hotels',
      name: 'Gate2Hotels B2B',
      slug: 'gate2hotels-b2b',
      description: 'Core B2B travel agent wholesale booking engine and hotel bedbank distributor.',
      category: 'Wholesale Booking Engine',
      owner: 'Azad Al-Gashtyar',
      status: 'OPERATIONAL',
      sort_order: 1,
      business_impact: 'High - Direct B2B revenue and agency reservation transactions.',
      investigation_stage: 'Normal operating parameters. All supplier gateways responding normally.',
      eta_text: null,
      last_updated_by: 'Azad Al-Gashtyar',
    },
    {
      id: 'sys_ticketaat',
      name: 'Ticketaat Flights',
      slug: 'ticketaat-flights',
      description: 'Online flight booking search engine, airline GDS aggregation, and automated ticketing.',
      category: 'Flight Distribution & GDS',
      owner: 'Azad Al-Gashtyar / Amenah Karim',
      status: 'DEGRADED',
      sort_order: 2,
      business_impact: 'Medium - Intermittent latency on flight multi-city searches; booking checkout remains functional.',
      investigation_stage: 'Fix in progress. Upstream Sabre GDS endpoint timeout thresholds adjusted; rolling out connection pool patch.',
      eta_text: 'Estimate: 2026-10-19 18:30 Baghdad Time',
      eta_timestamp: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
      eta_reason: 'Awaiting upstream Sabre network gateway failover stabilization',
      last_updated_by: 'Azad Al-Gashtyar',
    },
    {
      id: 'sys_extranet',
      name: 'Hotel Extranet',
      slug: 'hotel-extranet',
      description: 'Direct hotelier portal for inventory, allotments, dynamic pricing, and booking vouchers.',
      category: 'Partner Portal',
      owner: 'Marwan Salah / Azad Al-Gashtyar',
      status: 'OPERATIONAL',
      sort_order: 3,
      business_impact: 'Medium - Direct hotel partner inventory allocation and rate parity.',
      investigation_stage: 'Fully operational. Zero reported sync errors in last 48 hours.',
      eta_text: null,
      last_updated_by: 'Azad Al-Gashtyar',
    },
    {
      id: 'sys_channel_mgr',
      name: 'Channel Manager',
      slug: 'channel-manager',
      description: 'Two-way integration engine with DerbySoft, SiteMinder, RateGain, and custom hotel PMSs.',
      category: 'Integration Engine',
      owner: 'Azad Al-Gashtyar',
      status: 'OPERATIONAL',
      sort_order: 4,
      business_impact: 'High - Instant rate updates and room stop-sells across all channels.',
      investigation_stage: 'Nominal sync rate at 99.98% over past 7 days.',
      eta_text: null,
      last_updated_by: 'Azad Al-Gashtyar',
    },
    {
      id: 'sys_attendance',
      name: 'Attendance',
      slug: 'attendance-system',
      description: 'Company-wide biometric fingerprint synchronization, daily shifts, and HR reporting.',
      category: 'Internal Operations',
      owner: 'Amenah Karim',
      status: 'OPERATIONAL',
      sort_order: 5,
      business_impact: 'Low to Medium - Daily branch shifts, timekeeping, and payroll audit logs.',
      investigation_stage: 'Baghdad UTC+03:00 biometric gateway running without delay.',
      eta_text: null,
      last_updated_by: 'Amenah Karim',
    },
    {
      id: 'sys_corporate_web',
      name: 'Corporate Website',
      slug: 'corporate-website',
      description: 'Gashtyar Group public portal, corporate announcements, partner inquiries, and career portal.',
      category: 'Public Presence',
      owner: 'Hersh Ahmed',
      status: 'OPERATIONAL',
      sort_order: 6,
      business_impact: 'Low - Public corporate brand and contact channels.',
      investigation_stage: 'CDN and SSL certificates healthy across all edge nodes.',
      eta_text: null,
      last_updated_by: 'Hersh Ahmed',
    },
  ];

  for (const s of systems) {
    await db.execute({
      sql: `INSERT INTO systems (id, name, slug, description, category, owner, status, sort_order, is_archived, business_impact, investigation_stage, eta_text, eta_timestamp, eta_reason, last_updated_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.id,
        s.name,
        s.slug,
        s.description,
        s.category,
        s.owner,
        s.status,
        s.sort_order,
        s.business_impact,
        s.investigation_stage,
        s.eta_text,
        s.eta_timestamp || null,
        s.eta_reason || null,
        s.last_updated_by,
        now,
        now,
      ],
    });
  }

  // 3. Seed Incident for Ticketaat Flights
  const incidentId = 'inc_2026_001';
  const incidentEta = new Date(Date.now() + 2.5 * 3600 * 1000).toISOString();
  const nextUpdateDue = new Date(Date.now() + 45 * 60 * 1000).toISOString();

  await db.execute({
    sql: `INSERT INTO incidents 
          (id, incident_ref, title, description, severity, priority, business_impact, assigned_owner, reported_at, status, eta_date, eta_label, is_under_assessment, next_update_due, resolution_summary, resolved_at, root_cause, preventive_actions, created_by, created_at, updated_at)
          VALUES (?, 'INC-2026-001', ?, ?, 'HIGH', 'P2', ?, 'Azad Al-Gashtyar', ?, 'FIX_IN_PROGRESS', ?, 'Estimate', 0, ?, NULL, NULL, NULL, NULL, 'usr_admin_1', ?, ?)`,
    args: [
      incidentId,
      'Sabre GDS Latency Spike on Flight Search',
      'Flight search queries via Sabre GDS endpoint are taking up to 8.4 seconds due to an upstream European gateway routing bottleneck. Ticketing and booking checkout remain fully operational.',
      'Customers may experience slow search responses on multi-destination flight results.',
      new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      incidentEta,
      nextUpdateDue,
      now,
      now,
    ],
  });

  // Link incident to system
  await db.execute({
    sql: `INSERT INTO incident_systems (incident_id, system_id) VALUES (?, ?)`,
    args: [incidentId, 'sys_ticketaat'],
  });

  // Timeline entry
  await db.execute({
    sql: `INSERT INTO incident_timeline (id, incident_id, author_id, author_name, stage, message, eta_change_reason, new_eta, created_at)
          VALUES (?, ?, 'usr_admin_1', 'Azad Al-Gashtyar', 'FIX_IN_PROGRESS', ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      incidentId,
      'Upstream Sabre engineering confirmed European primary node routing issue. We enabled redundant Middle East gateway failover and connection pooling.',
      'Adjusted ETA based on upstream failover completion',
      incidentEta,
      now,
    ],
  });

  // 4. Seed Updates & Releases
  const update1Id = 'upd_multi_currency';
  await db.execute({
    sql: `INSERT INTO updates 
          (id, title, description, business_benefit, owner, update_type, status, publication_state, notification_state, target_date, release_date, version, created_by, created_at, updated_at)
          VALUES (?, 'Multi-Currency Direct Settlement for Gate2Hotels', 'B2B travel agents can now settle hotel bookings directly in IQD, USD, or EUR without multi-exchange commission deductions.', 'Eliminates 2.4% foreign transaction losses for regional partners and speeds up booking confirmations.', 'Azad Al-Gashtyar', 'NEW_FEATURE', 'RELEASED', 'PUBLISHED', 'SENT', ?, ?, 'v3.8.0', 'usr_admin_1', ?, ?)`,
    args: [
      update1Id,
      new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
      new Date(Date.now() - 4 * 86400 * 1000).toISOString(),
      now,
      now,
    ],
  });
  await db.execute({
    sql: `INSERT INTO update_systems (update_id, system_id) VALUES (?, ?)`,
    args: [update1Id, 'sys_gate2hotels'],
  });

  const update2Id = 'upd_ota_failover';
  await db.execute({
    sql: `INSERT INTO updates 
          (id, title, description, business_benefit, owner, update_type, status, publication_state, notification_state, target_date, release_date, version, created_by, created_at, updated_at)
          VALUES (?, 'Automated OTA Inventory Sync Failover', 'Introduced resilient backoff retry queues for Channel Manager room allotment transmissions to Booking.com and Expedia.', 'Protects against overbooking spikes during high season peak demand.', 'Azad Al-Gashtyar', 'IMPROVEMENT', 'TESTING', 'PUBLISHED', 'NOT_SENT', ?, NULL, 'v4.1.0-beta', 'usr_admin_1', ?, ?)`,
    args: [
      update2Id,
      new Date(Date.now() + 3 * 86400 * 1000).toISOString(),
      now,
      now,
    ],
  });
  await db.execute({
    sql: `INSERT INTO update_systems (update_id, system_id) VALUES (?, ?)`,
    args: [update2Id, 'sys_channel_mgr'],
  });

  // 5. Seed Infrastructure & Servers
  const servers = [
    {
      id: 'srv_app_prod',
      name: 'PRD-APP-01 (Frankfurt)',
      purpose: 'Core B2B Gate2Hotels & Channel Manager API cluster',
      hosting_provider: 'AWS eu-central-1',
      owner: 'Azad Al-Gashtyar',
      health_status: 'HEALTHY',
      cpu_percent: 24.5,
      memory_percent: 48.2,
      disk_percent: 38.0,
      last_check_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      database_health: 'NORMAL',
      last_backup_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      backup_result: 'SUCCESS',
      backup_schedule: 'Daily at 02:00 Baghdad Time',
      backup_retention: '30 Days encrypted AWS S3 Glacier',
      last_restore_test_at: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
      restore_outcome: 'VERIFIED',
      upcoming_maintenance: 'Kernel security patch window scheduled for Sunday 03:00 Baghdad Time',
      notes: 'Monitored via CloudWatch agent; auto-scaling pool set min=2, max=6.',
    },
    {
      id: 'srv_db_cluster',
      name: 'PRD-DB-PRIMARY (PostgreSQL RDS)',
      purpose: 'Primary transactional database for bookings and rate engine',
      hosting_provider: 'AWS Multi-AZ RDS',
      owner: 'Azad Al-Gashtyar',
      health_status: 'HEALTHY',
      cpu_percent: 18.2,
      memory_percent: 62.4,
      disk_percent: 42.1,
      last_check_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      database_health: 'OPTIMAL (Replication Lag < 12ms)',
      last_backup_at: new Date(Date.now() - 13 * 3600 * 1000).toISOString(),
      backup_result: 'SUCCESS',
      backup_schedule: 'Continuous WAL archiving + Daily snapshot 01:30 Baghdad',
      backup_retention: '35 Days Point-in-time recovery',
      last_restore_test_at: new Date(Date.now() - 12 * 86400 * 1000).toISOString(),
      restore_outcome: 'VERIFIED',
      upcoming_maintenance: 'Zero-downtime minor engine maintenance next quarter',
      notes: 'Read-replica handles analytical and reporting queries.',
    },
    {
      id: 'srv_attendance_local',
      name: 'LOCAL-BIOMETRIC-GW',
      purpose: 'Biometric fingerprint reader edge synchronization (Baghdad HQ & Erbil)',
      hosting_provider: 'On-premise Edge Server',
      owner: 'Amenah Karim / Azad Al-Gashtyar',
      health_status: 'MANUAL_STATUS',
      cpu_percent: null,
      memory_percent: null,
      disk_percent: null,
      last_check_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      database_health: 'NORMAL',
      last_backup_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      backup_result: 'SUCCESS',
      backup_schedule: 'Daily local encrypted tarball + sync to cloud',
      backup_retention: '90 Days archive',
      last_restore_test_at: new Date(Date.now() - 28 * 86400 * 1000).toISOString(),
      restore_outcome: 'VERIFIED',
      upcoming_maintenance: 'Battery backup (UPS) scheduled runtime test this month',
      notes: 'Manual health check verified during daily shift opening at 08:00.',
    },
  ];

  for (const srv of servers) {
    await db.execute({
      sql: `INSERT INTO server_assets 
            (id, name, purpose, hosting_provider, owner, health_status, cpu_percent, memory_percent, disk_percent, last_check_at, database_health, last_backup_at, backup_result, backup_schedule, backup_retention, last_restore_test_at, restore_outcome, upcoming_maintenance, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        srv.id,
        srv.name,
        srv.purpose,
        srv.hosting_provider,
        srv.owner,
        srv.health_status,
        srv.cpu_percent,
        srv.memory_percent,
        srv.disk_percent,
        srv.last_check_at,
        srv.database_health,
        srv.last_backup_at,
        srv.backup_result,
        srv.backup_schedule,
        srv.backup_retention,
        srv.last_restore_test_at,
        srv.restore_outcome,
        srv.upcoming_maintenance,
        srv.notes,
        now,
        now,
      ],
    });
  }

  // 6. Seed Cybersecurity & Findings
  const securityFindings = [
    {
      id: 'sec_001',
      title: 'MFA Enforcement on Corporate Email & Admin Portals',
      category: 'MFA',
      severity: 'HIGH',
      status: 'RESOLVED',
      affected_asset: 'Google Workspace & IT Admin Accounts',
      owner: 'Azad Al-Gashtyar',
      due_date: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
      remediation_plan: '100% of executive management and IT staff have hardware/app 2FA active. Company-wide rate is 94.2%.',
      restricted_details: 'FIDO2 WebAuthn keys issued to 5 privileged system administrators.',
    },
    {
      id: 'sec_002',
      title: 'Annual Wildcard SSL/TLS Certificate Renewal',
      category: 'CERT_DOMAIN',
      severity: 'MEDIUM',
      status: 'IN_PROGRESS',
      affected_asset: '*.gashtyar.com & *.gate2hotels.com',
      owner: 'Azad Al-Gashtyar',
      due_date: new Date(Date.now() + 18 * 86400 * 1000).toISOString(),
      remediation_plan: 'Automated Let’s Encrypt certbot renewing 14 days before expiry; DigiCert EV commercial certificate purchase approved.',
      restricted_details: 'Private keys stored in AWS KMS with role-based IAM boundary.',
    },
    {
      id: 'sec_003',
      title: 'Endpoint Antivirus & EDR Rollout on Travel Agency Desks',
      category: 'ENDPOINT',
      severity: 'LOW',
      status: 'IN_PROGRESS',
      affected_asset: 'Branch Office Workstations (Baghdad, Erbil, Sulaymaniyah)',
      owner: 'Azad Al-Gashtyar',
      due_date: new Date(Date.now() + 12 * 86400 * 1000).toISOString(),
      remediation_plan: 'Currently 72 of 75 agency terminals enrolled in central management portal.',
      restricted_details: '3 remaining terminals in Erbil scheduled for agent install during Friday maintenance.',
    },
  ];

  for (const sec of securityFindings) {
    await db.execute({
      sql: `INSERT INTO security_findings 
            (id, title, category, severity, status, affected_asset, owner, due_date, remediation_plan, restricted_details, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        sec.id,
        sec.title,
        sec.category,
        sec.severity,
        sec.status,
        sec.affected_asset,
        sec.owner,
        sec.due_date,
        sec.remediation_plan,
        sec.restricted_details,
        now,
        now,
      ],
    });
  }

  // 7. Seed Comments
  const comments = [
    {
      id: 'cmt_001',
      target_type: 'INCIDENT',
      target_id: incidentId,
      author_id: 'usr_mgr_1',
      author_name: 'Hersh Ahmed',
      author_role: 'MANAGER',
      content: 'Azad, are high-priority corporate accounts able to complete issuance while the Sabre latency is being resolved?',
      is_request_update: 1,
      created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: 'cmt_002',
      target_type: 'INCIDENT',
      target_id: incidentId,
      author_id: 'usr_admin_1',
      author_name: 'Azad Al-Gashtyar',
      author_role: 'ADMIN',
      content: '@Hersh Ahmed Yes, confirmed. Direct Amadeus GDS routing handles ticketing queue immediately. Only multi-destination search queries are affected by the slowdown.',
      is_request_update: 0,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'cmt_003',
      target_type: 'GENERAL',
      target_id: 'general_board',
      author_id: 'usr_mgr_2',
      author_name: 'Amenah Karim',
      author_role: 'MANAGER',
      content: 'Biometric shift records for the Eid holiday schedule have been synchronized across all branches. All branch managers have confirmed local punch logs.',
      is_request_update: 0,
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
  ];

  for (const c of comments) {
    await db.execute({
      sql: `INSERT INTO comments (id, target_type, target_id, author_id, author_name, author_role, content, is_edited, is_request_update, is_restricted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)`,
      args: [c.id, c.target_type, c.target_id, c.author_id, c.author_name, c.author_role, c.content, c.is_request_update, c.created_at, c.created_at],
    });
  }

  console.log('--- Seed Completed Successfully ---');
}
