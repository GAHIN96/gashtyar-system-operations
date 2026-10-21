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
  CheckCircle2,
} from 'lucide-react';
import { SystemCard, SystemItemData } from './SystemCard';
import { DashboardMetrics } from './MetricsRow';

interface DashboardSectionsProps {
  systems: SystemItemData[];
  metrics: DashboardMetrics;
  activeIncidents: any[];
  recentUpdates?: any[];
  comments?: any[];
  upcomingItems?: any[];
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
  recentUpdates = [],
  comments = [],
  upcomingItems = [],
  canManageSystems,
  onViewDetails,
  onOpenComments,
  onEditSystem,
  onNavigateTab,
}: DashboardSectionsProps) {
  const percentOperational = metrics.totalSystems > 0
    ? Math.round((metrics.operationalSystems / metrics.totalSystems) * 100)
    : 100;

  const pendingCount = (comments || []).filter(
    (c) => c.is_request_update === 1 && (!c.it_response || c.request_status === 'OPEN')
  ).length;

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

          {/* Incident Row Box or Clean Empty State */}
          {activeIncidents && activeIncidents.length > 0 ? (
            <div
              onClick={() => onNavigateTab('incidents')}
              className="p-3.5 rounded-xl bg-red-50/50 border border-red-200/70 hover:border-red-300 transition-all cursor-pointer flex items-center justify-between gap-3 my-auto"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 px-2 py-1 bg-red-100 text-[#EA2839] font-bold text-xs rounded-lg">
                  {activeIncidents[0].priority || 'P1'}
                </span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {activeIncidents[0].title}
                  </h4>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {activeIncidents[0].affected_systems_names || 'General'} &bull; {activeIncidents[0].reference_number || activeIncidents[0].id}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100/80 text-[#EA2839]">
                    {activeIncidents[0].status?.replace('_', ' ') || 'In Progress'}
                  </span>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {activeIncidents[0].eta_date
                      ? `ETA ${new Date(activeIncidents[0].eta_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Active'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab('incidents')}
              className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-200 transition-all cursor-pointer flex items-center justify-between gap-3 my-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">All Systems Operational</h4>
                  <p className="text-[11px] text-slate-500">No active incidents reported</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          )}
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

          {/* Update Row Box or Clean Empty State */}
          {recentUpdates && recentUpdates.length > 0 ? (
            <div
              onClick={() => onNavigateTab('updates')}
              className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-3 my-auto"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-[#0077C8] flex items-center justify-center shrink-0">
                  <Rocket className="w-4 h-4" />
                </div>
                {recentUpdates[0].version && (
                  <span className="text-xs font-bold text-[#0077C8] shrink-0">v{recentUpdates[0].version}</span>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {recentUpdates[0].title}
                  </h4>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {recentUpdates[0].affected_systems_names || 'General Release'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    {recentUpdates[0].status || 'Released'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {recentUpdates[0].release_date || (recentUpdates[0].created_at ? new Date(recentUpdates[0].created_at).toLocaleDateString([], { day: '2-digit', month: 'short' }) : '')}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab('updates')}
              className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all cursor-pointer flex items-center justify-between gap-3 my-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0077C8] flex items-center justify-center shrink-0">
                  <Rocket className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">No Releases Published Yet</h4>
                  <p className="text-[11px] text-slate-500">System releases and updates will appear here</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          )}
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
              {pendingCount > 0 ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Pending IT Response &nbsp;{pendingCount}
                </span>
              ) : comments && comments.length > 0 ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0077C8] border border-blue-200">
                  {comments.length} Messages
                </span>
              ) : null}
            </div>

            <button
              onClick={() => onNavigateTab('discussion')}
              className="text-xs font-semibold text-[#0077C8] hover:text-[#0060A8] flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All Messages</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real Comments or Clean Empty State */}
          {comments && comments.length > 0 ? (
            <div className="space-y-3">
              {comments.slice(0, 3).map((cmt) => {
                const authorInitial = (cmt.author_display_name || cmt.author_name || 'U').charAt(0).toUpperCase();
                const isManager = (cmt.author_actual_role || cmt.author_role) === 'MANAGER';
                const isAdmin = (cmt.author_actual_role || cmt.author_role) === 'ADMIN';
                const dateStr = cmt.created_at
                  ? new Date(cmt.created_at).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={cmt.id}
                    onClick={() => onNavigateTab('discussion')}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isAdmin ? 'bg-sky-100 text-[#0077C8]' : isManager ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
                        }`}
                      >
                        {authorInitial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{cmt.author_display_name || cmt.author_name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                              isAdmin ? 'bg-blue-50 text-[#0077C8] border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isAdmin ? 'IT MANAGER' : 'MANAGER'}
                          </span>
                          {cmt.is_request_update === 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 text-[#0077C8] border border-blue-200">
                              Update Requested
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">{dateStr}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {cmt.content}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400 pt-1">
                      {cmt.reply_count !== undefined && cmt.reply_count > 0 && (
                        <div className="flex items-center gap-1 font-semibold text-slate-500">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{cmt.reply_count}</span>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab('discussion')}
              className="py-10 px-4 rounded-xl bg-slate-50/50 border border-slate-100 text-center cursor-pointer hover:border-slate-200 transition-colors my-auto"
            >
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0077C8] flex items-center justify-center mx-auto mb-2.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No Management Discussions Yet</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                Discussions and operational inquiries between management and IT team will appear here in real time.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Upcoming & Important */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0077C8]" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming &amp; Important</h3>
            </div>
            <button
              onClick={() => onNavigateTab('updates')}
              className="text-xs font-semibold text-[#0077C8] hover:text-[#0060A8] flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real Upcoming Items or Clean Empty State */}
          {upcomingItems && upcomingItems.length > 0 ? (
            <div className="space-y-3">
              {upcomingItems.slice(0, 5).map((item) => {
                const getBadgeStyle = (badge: string) => {
                  const b = (badge || '').toUpperCase();
                  if (b === 'CRITICAL' || b === 'OVERDUE' || b === 'P1') {
                    return 'bg-rose-50 text-[#EA2839] border-rose-200';
                  }
                  if (b === 'HIGH' || b === 'P2') {
                    return 'bg-amber-50 text-amber-700 border-amber-200';
                  }
                  if (b === 'MEDIUM' || b === 'P3' || b === 'IN_PROGRESS' || b === 'TESTING') {
                    return 'bg-blue-50 text-[#0077C8] border-blue-200';
                  }
                  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                };

                const getIcon = (cat: string) => {
                  if (cat === 'Security') return <Shield className="w-4 h-4 text-emerald-600" />;
                  if (cat === 'Incident') return <AlertTriangle className="w-4 h-4 text-[#EA2839]" />;
                  if (cat === 'Release') return <Rocket className="w-4 h-4 text-[#0077C8]" />;
                  return <Building className="w-4 h-4 text-[#0077C8]" />;
                };

                const getIconBg = (cat: string) => {
                  if (cat === 'Security') return 'bg-emerald-50';
                  if (cat === 'Incident') return 'bg-rose-50';
                  if (cat === 'Release') return 'bg-blue-50';
                  return 'bg-slate-100';
                };

                const dateStr = item.date
                  ? new Date(item.date).toLocaleDateString([], { day: '2-digit', month: 'short' })
                  : 'Scheduled';

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.category === 'Incident') onNavigateTab('incidents');
                      else if (item.category === 'Security') onNavigateTab('security');
                      else onNavigateTab('updates');
                    }}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getIconBg(item.category)}`}>
                        {getIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        <div className="text-[11px] text-slate-400 truncate">{item.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium">{dateStr}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getBadgeStyle(item.badge)}`}>
                        {item.badge}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              onClick={() => onNavigateTab('updates')}
              className="py-10 px-4 rounded-xl bg-slate-50/50 border border-slate-100 text-center cursor-pointer hover:border-slate-200 transition-colors my-auto"
            >
              <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0077C8] flex items-center justify-center mx-auto mb-2.5">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No Upcoming Tasks or Deadlines</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-sm mx-auto">
                Scheduled releases, maintenance windows, and incident resolution targets will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
