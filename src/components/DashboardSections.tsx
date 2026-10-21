'use client';

import React from 'react';
import {
  LayoutGrid,
  Layers,
  AlertTriangle,
  Rocket,
  ChevronRight,
  Clock,
  MessageSquare,
  Building,
  UserCheck,
  FileText,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { SystemCard, SystemItemData } from './SystemCard';
import { DashboardMetrics } from './MetricsRow';

interface DashboardSectionsProps {
  systems: SystemItemData[];
  metrics: DashboardMetrics;
  activeIncidents: any[];
  recentUpdates?: any[];
  comments?: any[];
  canManageSystems: boolean;
  onViewDetails: (system: SystemItemData) => void;
  onOpenComments: (system: SystemItemData) => void;
  onEditSystem: (system: SystemItemData) => void;
  onNavigateTab: (tab: string) => void;
}

export function DashboardSections({
  systems,
  metrics,
  activeIncidents,
  canManageSystems,
  onViewDetails,
  onOpenComments,
  onEditSystem,
  onNavigateTab,
}: DashboardSectionsProps) {
  const percentOperational = metrics.totalSystems > 0
    ? Math.round((metrics.operationalSystems / metrics.totalSystems) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. SYSTEMS & SERVICES (Full Width Horizontal 6-Card Row)
         ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0077C8] flex items-center justify-center shrink-0">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Systems & Services
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                All operational systems at a glance
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('systems')}
            className="text-xs font-semibold text-[#0077C8] hover:text-[#0060A8] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All Systems</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Systems Cards Grid or Empty State */}
        {systems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {systems.map((sys) => (
              <SystemCard
                key={sys.id}
                system={sys}
                isAdmin={canManageSystems}
                onViewDetails={onViewDetails}
                onOpenComments={onOpenComments}
                onEditSystem={onEditSystem}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center shadow-xs">
            <LayoutGrid className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No Systems Registered Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              System is ready for production. Add and monitor your company's live services and booking engines from scratch.
            </p>
            {canManageSystems && (
              <button
                onClick={() => onNavigateTab('systems')}
                className="mt-3.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <span>+ Add First System</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          2. MIDDLE ROW: 3 Equal-Width Cards
             [System Health Overview] [Active Incidents] [Recent Updates]
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: System Health Overview */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-[#0077C8]" />
            <h3 className="text-sm font-bold text-slate-900">System Health Overview</h3>
          </div>

          <div className="flex items-center justify-between gap-6 my-auto py-2">
            {/* Circular Donut Gauge */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#E2E8F0"
                  strokeWidth="12"
                />
                {/* Green progress arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeDasharray={`${(percentOperational / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-slate-900 leading-none">
                  {percentOperational}%
                </span>
                <span className="text-[9px] font-bold text-emerald-600 tracking-wider mt-0.5">
                  HEALTHY
                </span>
              </div>
            </div>

            {/* Legend Stats */}
            <div className="flex-1 space-y-2.5 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Operational</span>
                </div>
                <span className="font-bold text-slate-900">{metrics.operationalSystems}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Degraded</span>
                </div>
                <span className="font-bold text-slate-900">{metrics.degradedSystems}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#EA2839]"></span>
                  <span>Unavailable</span>
                </div>
                <span className="font-bold text-slate-900">{metrics.unavailableSystems}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Incidents */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#EA2839]" />
              <h3 className="text-sm font-bold text-slate-900">Active Incidents</h3>
            </div>
            <button
              onClick={() => onNavigateTab('incidents')}
              className="text-xs font-semibold text-[#0077C8] hover:text-[#0060A8] flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Incident Row Box (Matching reference) */}
          <div
            onClick={() => onNavigateTab('incidents')}
            className="p-3.5 rounded-xl bg-red-50/50 border border-red-200/70 hover:border-red-300 transition-all cursor-pointer flex items-center justify-between gap-3 my-auto"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 px-2 py-1 bg-red-100 text-[#EA2839] font-bold text-xs rounded-lg">
                P1
              </span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  Sabre GDS Latency Spike on Flight Search
                </h4>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Ticketaat Flights &bull; INC-2026-001
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100/80 text-[#EA2839]">
                  In Progress
                </span>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  ETA 18:46:41
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </div>

        {/* Card 3: Recent Updates */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#0077C8]" />
              <h3 className="text-sm font-bold text-slate-900">Recent Updates</h3>
            </div>
            <button
              onClick={() => onNavigateTab('updates')}
              className="text-xs font-semibold text-[#0077C8] hover:text-[#0060A8] flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Update Row Box (Matching reference) */}
          <div
            onClick={() => onNavigateTab('updates')}
            className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-3 my-auto"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-[#0077C8] flex items-center justify-center shrink-0">
                <Rocket className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#0077C8] shrink-0">v2.4</span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  Multi-Currency Direct Settlement
                </h4>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Gate2Hotels B2B
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Deployed
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">15 Oct 2026</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. BOTTOM SECTION: 2 Columns
             Left (62%): Management Discussions & Requests
             Right (38%): Upcoming & Important
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Management Discussions & Requests */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0077C8] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Management Discussions & Requests
              </h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Pending IT Response &nbsp;1
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('discussion')}
              className="text-xs font-semibold text-[#0077C8] hover:text-[#0060A8] flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All Messages</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Discussion Rows (Exactly matching reference text & layout) */}
          <div className="space-y-3">
            {/* Message 1: Amenah Karim */}
            <div
              onClick={() => onNavigateTab('discussion')}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">Amenah Karim</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      MANAGER
                    </span>
                    <span className="text-[11px] text-slate-400">16 Oct 2026, 13:16</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    Biometric shift records for the Eid holiday schedule have been synchronized across all branches. All branch managers have confirmed local punch logs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-1 font-semibold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>2</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Message 2: Hersh Ahmed */}
            <div
              onClick={() => onNavigateTab('discussion')}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0077C8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  H
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">Hersh Ahmed</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      MANAGER
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 text-[#0077C8] border border-blue-200">
                      Update Requested
                    </span>
                    <span className="text-[11px] text-slate-400">16 Oct 2026, 11:45</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    Azad, are high-priority corporate accounts able to complete issuance while the Sabre latency is being resolved?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-1 font-semibold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>3</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* Message 3: Gahin Mayi */}
            <div
              onClick={() => onNavigateTab('discussion')}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer flex items-start justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-sky-100 text-[#0077C8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  G
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">Gahin Mayi</span>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 text-[#0077C8] border border-blue-200">
                      IT MANAGER
                    </span>
                    <span className="text-[11px] text-slate-400">16 Oct 2026, 10:20</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    Confirmed. Direct Amadeus GDS routing handles ticketing queue immediately. Only multi-destination search queries are affected by the slowdown.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400 pt-1">
                <div className="flex items-center gap-1 font-semibold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>1</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming & Important */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0077C8]" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming &amp; Important</h3>
            </div>
            <button
              onClick={() => onNavigateTab('servers')}
              className="text-xs font-semibold text-[#0077C8] hover:text-[#0060A8] flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5 Priority Rows (Matching reference) */}
          <div className="space-y-3">
            {/* Row 1 */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#EA2839] flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Follow up with PeakPoint credentials
                  </h4>
                  <div className="text-[11px] text-slate-400 truncate">Supplier Integration</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">18 Oct</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-[#EA2839] border border-rose-200">
                  Overdue
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-all" />
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Complete Yalago certification (2 test bookings)
                  </h4>
                  <div className="text-[11px] text-slate-400 truncate">Supplier Integration</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">20 Oct</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  High
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-all" />
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0077C8] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Juniper Extranet Training
                  </h4>
                  <div className="text-[11px] text-slate-400 truncate">Team Training</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">22 Oct</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-[#0077C8] border border-blue-200">
                  Medium
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-all" />
              </div>
            </div>

            {/* Row 4 */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Review Cloudflare IP restriction
                  </h4>
                  <div className="text-[11px] text-slate-400 truncate">Security</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">25 Oct</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-[#0077C8] border border-blue-200">
                  Medium
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-all" />
              </div>
            </div>

            {/* Row 5 */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    Monthly system health report
                  </h4>
                  <div className="text-[11px] text-slate-400 truncate">Reporting</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">31 Oct</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Low
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
