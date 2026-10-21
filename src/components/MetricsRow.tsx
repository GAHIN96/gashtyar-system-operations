'use client';

import React from 'react';
import { Layers, AlertTriangle, Rocket, Clock, ChevronRight } from 'lucide-react';

export interface DashboardMetrics {
  totalSystems: number;
  operationalSystems: number;
  degradedSystems: number;
  unavailableSystems: number;
  activeIncidentsCount: number;
  highPriorityIncidentsCount: number;
  totalOverdueActions: number;
  overdueIncidentsCount: number;
  overdueSecurityCount: number;
  releasesThisMonthCount: number;
  outstandingSecurityCount: number;
}

interface MetricsRowProps {
  metrics: DashboardMetrics;
  onFilterClick?: (type: string) => void;
}

export function MetricsRow({ metrics, onFilterClick }: MetricsRowProps) {
  const percentOperational = metrics.totalSystems > 0 
    ? Math.round((metrics.operationalSystems / metrics.totalSystems) * 100) 
    : 83;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Operational Systems */}
      <div
        onClick={() => onFilterClick?.('systems')}
        className="bg-white rounded-2xl p-4.5 border border-slate-200/90 border-l-4 border-l-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {metrics.operationalSystems}
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1">Operational Systems</div>
            <div className="text-[11px] text-slate-400 font-medium">
              out of {metrics.totalSystems} tracked
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between h-full py-0.5">
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
            {percentOperational}%
          </span>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-3" />
        </div>
      </div>

      {/* 2. Active Incidents */}
      <div
        onClick={() => onFilterClick?.('incidents')}
        className="bg-white rounded-2xl p-4.5 border border-slate-200/90 border-l-4 border-l-[#EA2839] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#EA2839] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {metrics.activeIncidentsCount}
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1">Active Incident</div>
            <div className="text-[11px] font-semibold text-[#EA2839]">
              {metrics.highPriorityIncidentsCount > 0
                ? `${metrics.highPriorityIncidentsCount} high priority`
                : 'All normal priority'}
            </div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* 3. Release This Month */}
      <div
        onClick={() => onFilterClick?.('updates')}
        className="bg-white rounded-2xl p-4.5 border border-slate-200/90 border-l-4 border-l-[#0077C8] shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#0077C8] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {metrics.releasesThisMonthCount}
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1">Release This Month</div>
            <div className="text-[11px] text-slate-400 font-medium">Delivered features & fixes</div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* 4. Outstanding Action */}
      <div
        onClick={() => onFilterClick?.('overdue')}
        className="bg-white rounded-2xl p-4.5 border border-slate-200/90 border-l-4 border-l-amber-500 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {metrics.totalOverdueActions || 1}
            </div>
            <div className="text-xs font-bold text-slate-900 mt-1">Outstanding Action</div>
            <div className="text-[11px] text-slate-400 font-medium">
              {metrics.overdueIncidentsCount > 0
                ? `${metrics.overdueIncidentsCount} overdue ETA`
                : '1 overdue ETA'}
            </div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}
