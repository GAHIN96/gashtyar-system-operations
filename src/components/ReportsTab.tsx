'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Rocket,
  ShieldAlert,
  Server,
  RefreshCw,
  Filter,
  FileText,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { formatBaghdad, formatRelative } from '@/lib/time';

type ReportType =
  | 'WEEKLY_OPERATIONS'
  | 'MONTHLY_PERFORMANCE'
  | 'SYSTEM_HEALTH'
  | 'INCIDENT_SUMMARY'
  | 'RELEASES_DEPLOYMENT'
  | 'CYBERSECURITY_SUMMARY'
  | 'INFRASTRUCTURE_BACKUP'
  | 'OUTSTANDING_REQUESTS';

export function ReportsTab() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('MONTHLY_PERFORMANCE');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [timeRange, setTimeRange] = useState('CURRENT_MONTH');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const json = await res.json();
        setReport(json);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleDownloadCsv = () => {
    window.location.href = `/api/reports?format=csv&type=${selectedReportType}&system=${selectedSystem}&range=${timeRange}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const reportOptions: { id: ReportType; label: string; icon: any; desc: string }[] = [
    {
      id: 'MONTHLY_PERFORMANCE',
      label: 'Monthly IT Performance Report',
      icon: FileSpreadsheet,
      desc: 'Overall IT operations, SLA compliance, MTTR, and releases.',
    },
    {
      id: 'WEEKLY_OPERATIONS',
      label: 'Weekly IT Operations Report',
      icon: Clock,
      desc: 'Active week operational summary, sprint tasks, and health telemetry.',
    },
    {
      id: 'SYSTEM_HEALTH',
      label: 'System Health Report',
      icon: Server,
      desc: 'Detailed availability percentages, downtime history, and incident impact.',
    },
    {
      id: 'INCIDENT_SUMMARY',
      label: 'Incident Summary & MTTR',
      icon: AlertTriangle,
      desc: 'P1-P4 incidents, root cause analyses, and restoration timelines.',
    },
    {
      id: 'RELEASES_DEPLOYMENT',
      label: 'Release and Deployment Report',
      icon: Rocket,
      desc: 'New features shipped, bug fixes, and publishing audit trails.',
    },
    {
      id: 'CYBERSECURITY_SUMMARY',
      label: 'Cybersecurity Summary',
      icon: ShieldAlert,
      desc: 'MFA coverage, vulnerability remediations, and access review status.',
    },
    {
      id: 'INFRASTRUCTURE_BACKUP',
      label: 'Infrastructure and Backup Report',
      icon: Server,
      desc: 'Backup completion vs verified restore tests, CPU/RAM/Disk telemetry.',
    },
    {
      id: 'OUTSTANDING_REQUESTS',
      label: 'Outstanding Management Requests',
      icon: HelpCircle,
      desc: 'Pending inquiries and update requests from company leadership.',
    },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-200">
        Generating report data...
      </div>
    );
  }

  const {
    reportMonth,
    systems = [],
    incidentMetrics = {},
    incidents = [],
    deliveredUpdates = [],
    openRisks = [],
    upcomingMaintenance = [],
  } = report || {};

  const currentOption = reportOptions.find((r) => r.id === selectedReportType);

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">{currentOption?.label}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentOption?.desc} (Baghdad Local Time: {formatBaghdad(new Date().toISOString(), 'short')})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Report Type Selector */}
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
          >
            {reportOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="CURRENT_WEEK">Current Week (Last 7 Days)</option>
            <option value="CURRENT_MONTH">Current Month ({reportMonth})</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="YEAR_TO_DATE">Year to Date (2026)</option>
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / PDF View</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Tracked Systems</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {systems.length} Systems
          </div>
          <div className="text-xs text-green-700 font-semibold mt-0.5">
            {systems.filter((s: any) => s.status === 'OPERATIONAL').length} Operational
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Incidents Logged / Resolved</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {incidentMetrics.totalThisMonth} reported &bull; {incidentMetrics.resolvedThisMonth} resolved
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Period performance</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Mean Time to Resolve</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {typeof incidentMetrics.avgResolutionHours === 'string' && incidentMetrics.avgResolutionHours.includes('No')
              ? incidentMetrics.avgResolutionHours
              : `${incidentMetrics.avgResolutionHours} hours`}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Calculated from verified audits</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Delivered Releases</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {deliveredUpdates.length} Releases
          </div>
          <div className="text-xs text-blue-700 font-semibold mt-0.5">Production deployments</div>
        </div>
      </div>

      {/* Report Content Panels */}
      <div className="space-y-6">
        {/* Panel 1: Systems Operational Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              <span>1. System Operational Health & Reliability</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">All Monitored Services</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">System Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Investigation Stage</th>
                  <th className="px-5 py-3">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {systems.map((s: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {s.logo_url ? (
                          <div className="w-6 h-6 rounded-md bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                            <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <Server className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{s.category}</td>
                    <td className="px-5 py-3.5 font-medium">{s.owner}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          s.status === 'OPERATIONAL'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                      {s.investigation_stage || 'Normal operations'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{s.eta_text || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 2: Incident Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>2. Incident Resolution Performance</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Logged Technical Issues</span>
          </div>
          <div className="overflow-x-auto">
            {incidents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No technical incidents logged this period.</div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Incident Ref</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Priority / Severity</th>
                    <th className="px-5 py-3">Affected Systems</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidents.map((inc: any) => (
                    <tr key={inc.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-mono font-bold text-red-700">{inc.incident_ref}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">{inc.title}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[10px]">
                          {inc.priority} &bull; {inc.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{inc.systems || 'None'}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            inc.status === 'RESOLVED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                        {formatBaghdad(inc.reported_at, 'short')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel 3: Delivered Releases & Roadmap */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Rocket className="w-4 h-4 text-blue-600" />
              <span>3. Delivered Enhancements & Releases</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Production Releases</span>
          </div>
          <div className="p-5 space-y-3">
            {deliveredUpdates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No releases delivered in this period.</div>
            ) : (
              deliveredUpdates.map((u: any) => (
                <div key={u.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">{u.title}</span>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {formatBaghdad(u.release_date, 'date')}
                    </span>
                  </div>
                  <div className="text-slate-700 leading-relaxed">{u.description}</div>
                  {u.business_benefit && (
                    <div className="mt-2 text-blue-800 font-medium">
                      <strong>Business Benefit:</strong> {u.business_benefit}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
