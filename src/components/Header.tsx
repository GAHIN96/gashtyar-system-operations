'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GashtyarLogo } from './GashtyarLogo';
import {
  Bell,
  ChevronDown,
  LogOut,
  Shield,
  Search,
  LayoutDashboard,
  Layers,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Server,
  ShieldCheck,
  Mail,
  Settings,
  Lock,
  MessagesSquare,
} from 'lucide-react';
import { NavTabId } from './NavTabs';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  status: 'ACTIVE' | 'INACTIVE';
  department: string;
}

interface HeaderProps {
  user: UserProfile;
  unreadCount?: number;
  onLogout: () => void;
  onSwitchRoleForDemo?: (targetEmail: string) => void;
  onOpenNotifications?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  activeTab?: NavTabId;
  onTabChange?: (tab: NavTabId) => void;
}

export function Header({
  user,
  unreadCount = 2,
  onLogout,
  onSwitchRoleForDemo,
  onOpenNotifications,
  searchQuery = '',
  onSearchChange,
  activeTab = 'dashboard',
  onTabChange,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [moreTabsOpen, setMoreTabsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreTabsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user.role === 'ADMIN';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'IT Manager';
      case 'MANAGER':
        return 'Management';
      default:
        return 'Auditor';
    }
  };

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'H';

  const primaryNavTabs: { id: NavTabId; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'systems', label: 'Systems', icon: Layers },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'updates', label: 'Updates', icon: FileText },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  const secondaryNavTabs: { id: NavTabId; label: string; icon: any }[] = [
    { id: 'discussion', label: 'Management Discussions', icon: MessagesSquare },
    { id: 'servers', label: 'Servers & Backups', icon: Server },
    { id: 'security', label: 'Cybersecurity', icon: ShieldCheck },
    { id: 'notifications', label: 'Email Notifications', icon: Mail },
    { id: 'admin', label: 'Settings & Users', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* 1. Left: Official Brand Logo & Title */}
          <div className="shrink-0 flex items-center">
            <GashtyarLogo subtitle="IT OPERATIONS" />
          </div>

          {/* 2. Center: Horizontal Navigation Tabs (Single unified navbar) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 h-16">
            {primaryNavTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const hasBadge = tab.id === 'incidents' && typeof unreadCount === 'number' && unreadCount > 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs lg:text-[13px] font-semibold transition-all h-full border-b-2 cursor-pointer ${
                    isActive
                      ? 'border-[#0077C8] text-[#0077C8] font-bold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#0077C8]' : 'text-slate-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                  {hasBadge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white bg-red-500">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Additional Sections Dropdown */}
            <div className="relative h-full flex items-center" ref={moreRef}>
              <button
                onClick={() => setMoreTabsOpen(!moreTabsOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-2 text-xs lg:text-[13px] font-semibold transition-all cursor-pointer h-full border-b-2 ${
                  secondaryNavTabs.some((t) => t.id === activeTab)
                    ? 'border-[#0077C8] text-[#0077C8] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {moreTabsOpen && (
                <div className="absolute top-14 left-0 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-modal">
                  {secondaryNavTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          onTabChange?.(tab.id);
                          setMoreTabsOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${
                          activeTab === tab.id
                            ? 'bg-[#EBF5FB] text-[#0077C8] font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* 3. Right: Search Box + Notification Bell + User Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Search Input (Pill style matching reference) */}
            {onSearchChange && (
              <div className="relative hidden xl:block w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search systems, incidents, updates..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 border border-transparent focus:border-[#0077C8] focus:bg-white rounded-full outline-none transition-all placeholder:text-slate-400 text-slate-900"
                />
              </div>
            )}

            {/* Notification Bell with Red Badge "2" */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EA2839] px-1 text-[10px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            </button>

            {/* Profile Dropdown Container */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1 sm:px-2 sm:py-1 rounded-full hover:bg-slate-50 transition-all cursor-pointer text-left"
              >
                {/* Circular Initial Avatar */}
                <div className="w-8 h-8 rounded-full bg-[#0077C8] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {initial}
                </div>

                {/* Name & Role */}
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {user.name || 'Hersh Ahmed'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-modal">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {getRoleLabel(user.role)}
                      </span>
                      <span className="text-[11px] text-slate-500">{user.department}</span>
                    </div>
                  </div>

                  {/* Fast Role Switch for Verification / Testing */}
                  {onSwitchRoleForDemo && (
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Test Role Accounts (Demo Switch)
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onSwitchRoleForDemo('it@gate2hotels.co');
                          }}
                          className={`px-2 py-1.5 text-[11px] rounded-lg font-bold border text-center transition-colors cursor-pointer ${
                            user.role === 'ADMIN'
                              ? 'bg-[#0077C8] text-white border-[#0077C8] shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          IT Manager
                        </button>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onSwitchRoleForDemo('almaeegahin@gmail.com');
                          }}
                          className={`px-2 py-1.5 text-[11px] rounded-lg font-bold border text-center transition-colors cursor-pointer ${
                            user.role === 'MANAGER'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          Manager Test
                        </button>
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onSwitchRoleForDemo('auditor@gashtyar.com');
                          }}
                          className={`px-2 py-1.5 text-[11px] rounded-lg font-bold border text-center transition-colors cursor-pointer ${
                            user.role === 'VIEWER'
                              ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          Auditor
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sign Out */}
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#EA2839] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
