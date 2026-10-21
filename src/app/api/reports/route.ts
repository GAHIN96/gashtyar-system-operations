import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getDb, initDb } from '@/lib/db';
import { formatBaghdad } from '@/lib/time';

export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  await initDb();
  const db = getDb();

  const format = req.nextUrl.searchParams.get('format');
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Systems summary
  const systemsRes = await db.execute(`
    SELECT name, category, owner, status, investigation_stage, eta_text 
    FROM systems 
    WHERE is_archived = 0 
    ORDER BY name ASC
  `);

  // Incidents this month
  const incidentsRes = await db.execute({
    sql: `SELECT i.*, GROUP_CONCAT(s.name, ', ') as systems
          FROM incidents i
          LEFT JOIN incident_systems ins ON i.id = ins.incident_id
          LEFT JOIN systems s ON ins.system_id = s.id
          WHERE i.reported_at >= ?
          GROUP BY i.id
          ORDER BY i.reported_at DESC`,
    args: [currentMonthStart],
  });

  const totalIncidentsThisMonth = incidentsRes.rows.length;
  const resolvedIncidentsThisMonth = incidentsRes.rows.filter((i) => i.status === 'RESOLVED').length;

  // Calculate resolution times for resolved incidents
  let totalResolutionMinutes = 0;
  let resolvedCountWithTimestamps = 0;
  for (const inc of incidentsRes.rows) {
    if (inc.status === 'RESOLVED' && inc.reported_at && inc.resolved_at) {
      const diffMs = new Date(inc.resolved_at as string).getTime() - new Date(inc.reported_at as string).getTime();
      if (diffMs > 0) {
        totalResolutionMinutes += Math.round(diffMs / (60 * 1000));
        resolvedCountWithTimestamps++;
      }
    }
  }
  const avgResolutionHours =
    resolvedCountWithTimestamps > 0
      ? (totalResolutionMinutes / resolvedCountWithTimestamps / 60).toFixed(1)
      : 'No resolved incidents this period';

  // Delivered updates this month
  const updatesRes = await db.execute({
    sql: `SELECT u.*, GROUP_CONCAT(s.name, ', ') as systems
          FROM updates u
          LEFT JOIN update_systems us ON u.id = us.update_id
          LEFT JOIN systems s ON us.system_id = s.id
          WHERE u.publication_state = 'PUBLISHED' AND u.status = 'RELEASED' AND u.release_date >= ?
          GROUP BY u.id
          ORDER BY u.release_date DESC`,
    args: [currentMonthStart],
  });

  // Open security risks
  const risksRes = await db.execute(`
    SELECT title, category, severity, status, affected_asset, owner, due_date, remediation_plan
    FROM security_findings
    WHERE status != 'RESOLVED' AND status != 'ACCEPTED'
    ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END
  `);

  // Upcoming maintenance from servers
  const maintenanceRes = await db.execute(`
    SELECT name, hosting_provider, upcoming_maintenance
    FROM server_assets
    WHERE upcoming_maintenance IS NOT NULL AND TRIM(upcoming_maintenance) != ''
  `);

  if (format === 'csv') {
    // Generate CSV for export
    const rows = [
      ['Gashtyar IT Operations - Monthly Management Report'],
      ['Generated At (Baghdad Time)', formatBaghdad(new Date().toISOString(), 'full')],
      ['Reported Period', `${new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(now)}`],
      [''],
      ['SYSTEM HEALTH SUMMARY'],
      ['System Name', 'Category', 'Owner', 'Operational Status', 'Investigation Stage', 'ETA'],
      ...systemsRes.rows.map((s) => [
        `"${s.name}"`,
        `"${s.category}"`,
        `"${s.owner}"`,
        `"${s.status}"`,
        `"${(s.investigation_stage as string || '').replace(/"/g, '""')}"`,
        `"${s.eta_text || 'None'}"`,
      ]),
      [''],
      ['INCIDENTS PERFORMANCE'],
      ['Total Opened This Month', String(totalIncidentsThisMonth)],
      ['Resolved This Month', String(resolvedIncidentsThisMonth)],
      ['Average Resolution Time', String(avgResolutionHours)],
      ['Incident Ref', 'Title', 'Severity', 'Priority', 'Systems', 'Status', 'Reported At', 'Resolved At'],
      ...incidentsRes.rows.map((i) => [
        `"${i.incident_ref}"`,
        `"${(i.title as string || '').replace(/"/g, '""')}"`,
        `"${i.severity}"`,
        `"${i.priority}"`,
        `"${i.systems || ''}"`,
        `"${i.status}"`,
        `"${formatBaghdad(i.reported_at as string, 'full')}"`,
        `"${formatBaghdad(i.resolved_at as string, 'full')}"`,
      ]),
      [''],
      ['DELIVERED RELEASES & FEATURES'],
      ['Title', 'Type', 'Version', 'Systems', 'Release Date', 'Business Benefit'],
      ...updatesRes.rows.map((u) => [
        `"${(u.title as string || '').replace(/"/g, '""')}"`,
        `"${u.update_type}"`,
        `"${u.version || ''}"`,
        `"${u.systems || ''}"`,
        `"${formatBaghdad(u.release_date as string, 'date')}"`,
        `"${(u.business_benefit as string || '').replace(/"/g, '""')}"`,
      ]),
      [''],
      ['OPEN SECURITY REMEDIATIONS'],
      ['Title', 'Category', 'Severity', 'Asset', 'Owner', 'Due Date', 'Remediation Plan'],
      ...risksRes.rows.map((r) => [
        `"${(r.title as string || '').replace(/"/g, '""')}"`,
        `"${r.category}"`,
        `"${r.severity}"`,
        `"${r.affected_asset}"`,
        `"${r.owner}"`,
        `"${formatBaghdad(r.due_date as string, 'date')}"`,
        `"${(r.remediation_plan as string || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gashtyar-it-report-${now.toISOString().slice(0, 7)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    reportMonth: new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(now),
    systems: systemsRes.rows,
    incidentMetrics: {
      totalThisMonth: totalIncidentsThisMonth,
      resolvedThisMonth: resolvedIncidentsThisMonth,
      avgResolutionHours,
    },
    incidents: incidentsRes.rows,
    deliveredUpdates: updatesRes.rows,
    openRisks: risksRes.rows,
    upcomingMaintenance: maintenanceRes.rows,
  });
}
