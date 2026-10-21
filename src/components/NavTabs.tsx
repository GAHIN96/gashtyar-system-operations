'use client';

import React from 'react';
import {
  LayoutDashboard,
  Server,
  AlertTriangle,
  Rocket,
  Mail,
  HardDrive,
  ShieldCheck,
  MessagesSquare,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'systems'
  | 'incidents'
  | 'updates'
  | 'notifications'
  | 'servers'
  | 'security'
  | 'discussion'
  | 'reports'
  | 'admin';

interface NavTabsProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  isAdmin: boolean;
  activeIncidentsCount?: number;
  unreadCommentsCount?: number;
  queuedEmailsCount?: number;
}

export function NavTabs({
  activeTab,
  onTabChange,
  isAdmin,
  activeIncidentsCount = 0,
  unreadCommentsCount = 0,
  queuedEmailsCount = 0,
}: NavTabsProps) {
  // All 10 sections requested in Project Specification
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'systems', label: 'Systems & Services', icon: Server },
    {
      id: 'incidents',
      label: 'Incidents',
      icon: AlertTriangle,
      badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
      badgeColor: 'bg-red-500',
    },
    { id: 'updates', label: 'Releases & Updates', icon: Rocket },
    { id: 'servers', label: 'Servers & Backups', icon: HardDrive },
    { id: 'security', label: 'Cybersecurity', icon: ShieldCheck },
    {
      id: 'discussion',
      label: 'Management Discussions',
      icon: MessagesSquare,
      badge: unreadCommentsCount > 0 ? unreadCommentsCount : undefined,
      badgeColor: 'bg-amber-500',
    },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    ...(isAdmin
      ? [
          {
            id: 'notifications' as NavTabId,
            label: 'Email Notifications',
            icon: Mail,
            badge: queuedEmailsCount > 0 ? queuedEmailsCount : undefined,
            badgeColor: 'bg-blue-500',
          },
          { id: 'admin' as NavTabId, label: 'Settings', icon: Settings },
        ]
      : []),
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-3 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as NavTabId)}
                className={`group flex items-center gap-2 px-3 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-[#0077C8] text-[#0077C8] bg-[#EBF5FB]/70'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#0077C8]' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
