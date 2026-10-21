import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  await initDb();
  await seedDatabase();
  const db = getDb();
  const now = new Date();

  // 1. Systems & Status breakdown
  const systemsRes = await db.execute(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'SYSTEM' AND c.target_id = s.id) as comment_count
    FROM systems s
    WHERE s.is_archived = 0
    ORDER BY s.sort_order ASC, s.name ASC
  `);

  const systems = systemsRes.rows;
  const totalSystems = systems.length;
  const operationalSystems = systems.filter((s) => s.status === 'OPERATIONAL').length;
  const degradedSystems = systems.filter((s) => s.status === 'DEGRADED').length;
  const unavailableSystems = systems.filter((s) => s.status === 'UNAVAILABLE').length;

  // 2. Active Incidents
  const activeIncidentsRes = await db.execute(`
    SELECT i.*, 
      GROUP_CONCAT(s.name, ', ') as affected_systems_names,
      GROUP_CONCAT(s.id, ',') as affected_system_ids,
      (SELECT COUNT(*) FROM comments c WHERE c.target_type = 'INCIDENT' AND c.target_id = i.id) as comment_count
    FROM incidents i
    LEFT JOIN incident_systems ins ON i.id = ins.incident_id
    LEFT JOIN systems s ON ins.system_id = s.id
    WHERE i.status != 'RESOLVED'
    GROUP BY i.id
    ORDER BY 
      CASE i.priority
        WHEN 'P1' THEN 1
        WHEN 'P2' THEN 2
        WHEN 'P3' THEN 3
        ELSE 4
      END,
      i.reported_at DESC
  `);
  const activeIncidents = activeIncidentsRes.rows;
  const activeIncidentsCount = activeIncidents.length;
  const highPriorityIncidentsCount = activeIncidents.filter(
    (i) => i.priority === 'P1' || i.priority === 'P2' || i.severity === 'CRITICAL' || i.severity === 'HIGH'
  ).length;

  // 3. Overdue Actions:
  // - Incidents where status != RESOLVED and eta_date is past current time
  // - Incidents where status != RESOLVED and next_update_due is past current time
  // - Security remediation actions where status != RESOLVED and due_date is past current time
  let overdueIncidentsCount = 0;
  for (const inc of activeIncidents) {
    const isEtaOverdue = inc.eta_date && new Date(inc.eta_date as string).getTime() < now.getTime();
    const isUpdateOverdue = inc.next_update_due && new Date(inc.next_update_due as string).getTime() < now.getTime();
    if (isEtaOverdue || isUpdateOverdue) {
      overdueIncidentsCount++;
    }
  }

  const overdueSecRes = await db.execute(`
    SELECT COUNT(*) as count FROM security_findings 
    WHERE status != 'RESOLVED' AND status != 'ACCEPTED' AND due_date IS NOT NULL AND datetime(due_date) < datetime('now')
  `);
  const overdueSecurityCount = Number(overdueSecRes.rows[0].count || 0);
  const totalOverdueActions = overdueIncidentsCount + overdueSecurityCount;

  // 4. Releases delivered this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const releasesThisMonthRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM updates 
          WHERE status = 'RELEASED' AND publication_state = 'PUBLISHED' AND release_date >= ?`,
    args: [startOfMonth],
  });
  const releasesThisMonthCount = Number(releasesThisMonthRes.rows[0].count || 0);

  // 5. Outstanding Security Actions
  const openSecurityRes = await db.execute(`
    SELECT COUNT(*) as count FROM security_findings 
    WHERE status IN ('OPEN', 'IN_PROGRESS')
  `);
  const outstandingSecurityCount = Number(openSecurityRes.rows[0].count || 0);

  // 5b. Resolved Incidents Count & Weekly incident stats
  const resolvedIncRes = await db.execute(`
    SELECT COUNT(*) as count FROM incidents WHERE status IN ('RESOLVED', 'CLOSED')
  `);
  const resolvedIncidentsCount = Number(resolvedIncRes.rows[0].count || 0);

  // 6. Enrich systems with their latest published update & active incidents
  const isAdmin = auth.user?.role === 'ADMIN';
  const enrichedSystems = [];
  for (const s of systems) {
    // Linked active incident
    const sysIncidents = activeIncidents.filter((inc) => {
      const ids = (inc.affected_system_ids as string || '').split(',');
      return ids.includes(s.id as string);
    });

    // Latest published update
    const latestUpdateRes = await db.execute({
      sql: `SELECT u.title, u.update_type, u.version, u.release_date, u.status, u.created_at
            FROM updates u
            JOIN update_systems us ON u.id = us.update_id
            WHERE us.system_id = ? AND u.publication_state = 'PUBLISHED'
            ORDER BY COALESCE(u.release_date, u.created_at) DESC LIMIT 1`,
      args: [s.id as string],
    });

    // Upcoming planned work
    const upcomingWorkRes = await db.execute({
      sql: `SELECT u.title, u.target_date, u.status
            FROM updates u
            JOIN update_systems us ON u.id = us.update_id
            WHERE us.system_id = ? AND u.publication_state = 'PUBLISHED' AND u.status IN ('PLANNED', 'IN_PROGRESS', 'TESTING')
            ORDER BY u.target_date ASC LIMIT 1`,
      args: [s.id as string],
    });

    let configDetails = s.config_details as string || '';
    if (!isAdmin && configDetails) {
      const { maskSensitiveConfigs } = await import('@/lib/mask');
      configDetails = maskSensitiveConfigs(configDetails);
    }

    enrichedSystems.push({
      ...s,
      config_details: configDetails,
      activeIncidents: sysIncidents,
      hasActiveIncident: sysIncidents.length > 0,
      activeIncidentSummary: sysIncidents.length > 0 ? sysIncidents[0].title : null,
      activeIncidentPriority: sysIncidents.length > 0 ? sysIncidents[0].priority : null,
      latestUpdate: latestUpdateRes.rows[0] || null,
      upcomingWork: upcomingWorkRes.rows[0] || null,
    });
  }

  // 7. Recent Management Discussion Comments
  const recentCommentsRes = await db.execute(`
    SELECT c.*, u.name as user_name
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    ORDER BY c.created_at DESC LIMIT 10
  `);

  // 8. Recent Activity Feed (System changes, incident updates, releases, comments, notifications, security events)
  const recentActivityRes = await db.execute(`
    SELECT a.*, 
           COALESCE(u.name, a.user_email, 'System') as actor_name,
           u.role as actor_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC LIMIT 20
  `);

  return NextResponse.json({
    metrics: {
      totalSystems,
      operationalSystems,
      degradedSystems,
      unavailableSystems,
      activeIncidentsCount,
      resolvedIncidentsCount,
      highPriorityIncidentsCount,
      totalOverdueActions,
      overdueIncidentsCount,
      overdueSecurityCount,
      releasesThisMonthCount,
      outstandingSecurityCount,
    },
    systems: enrichedSystems,
    activeIncidents,
    recentComments: recentCommentsRes.rows,
    recentActivity: recentActivityRes.rows,
    currentUser: auth.user,
  });
}

