'use client';

import React from 'react';
import {
  AlertTriangle,
  Rocket,
  Mail,
  HardDrive,
  ShieldCheck,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';

interface QuickActionsProps {
  onReportIncident: () => void;
  onPublishUpdate: () => void;
  onSendNotification: () => void;
  onNavigateTab: (tabId: 'servers' | 'security' | 'reports') => void;
  isAdmin: boolean;
}

export function QuickActions({
  onReportIncident,
  onPublishUpdate,
  onSendNotification,
  onNavigateTab,
  isAdmin,
}: QuickActionsProps) {
  const actions = [
    {
      id: 'incident',
      label: 'Report Incident',
      desc: 'Log technical outage',
      icon: AlertTriangle,
      iconBg: 'bg-[#EA2839]',
      action: onReportIncident,
      adminOnly: true,
    },
    {
      id: 'update',
      label: 'Publish Update',
      desc: 'Feature or bug fix',
      icon: Rocket,
      iconBg: 'bg-[#0077C8]',
      action: onPublishUpdate,
      adminOnly: true,
    },
    {
      id: 'notification',
      label: 'Send Notification',
      desc: 'Manual push email',
      icon: Mail,
      iconBg: 'bg-[#EA2839]',
      action: onSendNotification,
      adminOnly: true,
    },
    {
      id: 'servers',
      label: 'Infrastructure',
      desc: 'Backups & health',
      icon: HardDrive,
      iconBg: 'bg-emerald-600',
      action: () => onNavigateTab('servers'),
      adminOnly: false,
    },
    {
      id: 'security',
      label: 'Cybersecurity',
      desc: 'MFA & patch audit',
      icon: ShieldCheck,
      iconBg: 'bg-indigo-600',
      action: () => onNavigateTab('security'),
      adminOnly: false,
    },
    {
      id: 'reports',
      label: 'Monthly Report',
      desc: 'Export summary CSV',
      icon: FileSpreadsheet,
      iconBg: 'bg-slate-700',
      action: () => onNavigateTab('reports'),
      adminOnly: false,
    },
  ];

  return (
    <div className="mb-8">
      {/* Centered Divider with Dots (matches attached visual reference) */}
      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-slate-200/80 w-full max-w-sm"></div>
        <div className="px-4 text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-1.5 bg-slate-50">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0077C8]"></span>
          Quick Actions
          <span className="w-1.5 h-1.5 rounded-full bg-[#0077C8]"></span>
        </div>
        <div className="border-t border-slate-200/80 w-full max-w-sm"></div>
      </div>

      {/* Grid of 6 Quick Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((act) => {
          if (act.adminOnly && !isAdmin) return null;
          const Icon = act.icon;

          return (
            <div
              key={act.id}
              onClick={act.action}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col items-center text-center group"
            >
              <div
                className={`w-11 h-11 rounded-xl ${act.iconBg} text-white flex items-center justify-center mb-3 shadow-xs group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                {act.label}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5 mb-3 line-clamp-1">
                {act.desc}
              </div>
              <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-blue-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mt-auto">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
