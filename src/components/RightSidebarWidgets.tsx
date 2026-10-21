'use client';

import React from 'react';
import { AlertTriangle, Clock, ShieldCheck, ChevronRight, HardDrive } from 'lucide-react';
import { DashboardMetrics } from './MetricsRow';

interface RightSidebarWidgetsProps {
  metrics: DashboardMetrics;
  onNavigateTab: (tabId: string) => void;
  onViewIncidentModal?: () => void;
}

export function RightSidebarWidgets({
  metrics,
  onNavigateTab,
  onViewIncidentModal,
}: RightSidebarWidgetsProps) {
  // Operational percentage calculation (real data only)
  const operationalPercent =
    metrics.totalSystems > 0
      ? Math.round((metrics.operationalSystems / metrics.totalSystems) * 100)
      : 100;

  // SVG circular stroke calculation for the donut
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (operationalPercent / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* 1. Needs Attention Card (matches visual reference) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-red-600 uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>Needs Attention</span>
        </div>

        <div className="space-y-2.5">
          {/* Active Incidents Row */}
          <div
            onClick={() => onNavigateTab('incidents')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
          >
            <span className="text-xs font-semibold text-slate-700">Active incidents</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                metrics.activeIncidentsCount > 0
                  ? 'bg-red-100 text-red-700 font-extrabold'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {metrics.activeIncidentsCount}
            </span>
          </div>

          {/* Overdue ETAs Row */}
          <div
            onClick={() => onNavigateTab('incidents')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
          >
            <span className="text-xs font-semibold text-slate-700">Overdue commitments</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                metrics.overdueIncidentsCount > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {metrics.overdueIncidentsCount}
            </span>
          </div>

          {/* Outstanding Security Remediation */}
          <div
            onClick={() => onNavigateTab('security')}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-100"
          >
            <span className="text-xs font-semibold text-slate-700">Security remediation tasks</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                metrics.outstandingSecurityCount > 0
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {metrics.outstandingSecurityCount}
            </span>
          </div>
        </div>

        {/* Action Button */}
        {metrics.activeIncidentsCount > 0 && onViewIncidentModal && (
          <button
            onClick={onViewIncidentModal}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200"
          >
            <span>Review Active Incident</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Systems Health Donut Overview (matches 88% Present donut from visual reference) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Systems Health Overview</h3>
            <span className="text-[11px] text-slate-500">Live operational distribution</span>
          </div>
        </div>

        <div className="flex items-center justify-center py-2">
          {/* Donut graphic */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="text-slate-100"
                strokeWidth="14"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Foreground progress circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className={
                  operationalPercent === 100
                    ? 'text-green-600'
                    : operationalPercent > 70
                    ? 'text-green-600'
                    : 'text-amber-500'
                }
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                {operationalPercent}%
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">
                Healthy
              </span>
            </div>
          </div>
        </div>

        {/* Legend List (matches reference) */}
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="font-medium">Operational</span>
            </div>
            <span className="font-bold text-slate-900">{metrics.operationalSystems}</span>
          </div>

          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-medium">Degraded</span>
            </div>
            <span className="font-bold text-slate-900">{metrics.degradedSystems}</span>
          </div>

          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="font-medium">Unavailable</span>
            </div>
            <span className="font-bold text-slate-900">{metrics.unavailableSystems}</span>
          </div>
        </div>
      </div>

      {/* 3. Operational Notice & Quick Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
            Operational Posture
          </span>
          <HardDrive className="w-4 h-4 text-blue-300" />
        </div>
        <div className="text-lg font-bold">Encrypted Multi-Zone Backups</div>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Daily offsite snapshots in AWS Frankfurt S3 Glacier. Last restore validation succeeded 6 days ago.
        </p>
        <button
          onClick={() => onNavigateTab('servers')}
          className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          <span>View Recovery Verification</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
