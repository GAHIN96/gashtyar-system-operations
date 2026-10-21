'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header, UserProfile } from '@/components/Header';
import { NavTabId } from '@/components/NavTabs';
import { HeroBanner } from '@/components/HeroBanner';
import { MetricsRow, DashboardMetrics } from '@/components/MetricsRow';
import { QuickActions } from '@/components/QuickActions';
import { SystemCard, SystemItemData } from '@/components/SystemCard';
import { RightSidebarWidgets } from '@/components/RightSidebarWidgets';
import { SystemDrawer } from '@/components/SystemDrawer';
import { IncidentModal } from '@/components/IncidentModal';
import { UpdateModal } from '@/components/UpdateModal';
import { NotificationSendModal } from '@/components/NotificationSendModal';
import { SystemEditModal } from '@/components/SystemEditModal';
import { IncidentsTab } from '@/components/IncidentsTab';
import { UpdatesTab } from '@/components/UpdatesTab';
import { ServersTab } from '@/components/ServersTab';
import { SecurityTab } from '@/components/SecurityTab';
import { EmailLogsTab } from '@/components/EmailLogsTab';
import { DiscussionSection } from '@/components/DiscussionSection';
import { ReportsTab } from '@/components/ReportsTab';
import { AdminUsersTab } from '@/components/AdminUsersTab';
import { AuthModal } from '@/components/AuthModal';
import { GashtyarLogo } from '@/components/GashtyarLogo';
import { DashboardSections } from '@/components/DashboardSections';
import {
  Plus,
  Server,
  AlertTriangle,
  RefreshCw,
  Layers,
  Activity,
  History,
  Shield,
  Clock,
  Sparkles,
  MessageSquare,
  Mail,
  Lock,
} from 'lucide-react';
import { formatBaghdad, formatRelative, nowUtc } from '@/lib/time';

export default function GashtyarITOperationsApp() {
  // Authentication & Per-Tab context states
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tabToken, setTabToken] = useState<string>('');
  const [authChecking, setAuthChecking] = useState(true);

  // Active Navigation Tab (10 sections)
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');

  // Global Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard Data State
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSystems: 6,
    operationalSystems: 5,
    degradedSystems: 1,
    unavailableSystems: 0,
    activeIncidentsCount: 1,
    highPriorityIncidentsCount: 1,
    totalOverdueActions: 0,
    overdueIncidentsCount: 0,
    overdueSecurityCount: 0,
    releasesThisMonthCount: 1,
    outstandingSecurityCount: 2,
  });
  const [systems, setSystems] = useState<SystemItemData[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Modals & Drawers States
  const [selectedDrawerSystem, setSelectedDrawerSystem] = useState<SystemItemData | null>(null);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationDefaults, setNotificationDefaults] = useState<any>({});
  const [systemEditModalOpen, setSystemEditModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<any | null>(null);

  // Handle tab change and update URL history
  const handleTabChange = (tab: NavTabId) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const newUrl = tab === 'dashboard' ? '/' : `/?tab=${tab}`;
      window.history.pushState({ tab }, '', newUrl);
    }
  };

  // Initialize or retrieve Per-Tab Access Context from sessionStorage & sync tab from URL
  useEffect(() => {
    // Read tab from URL query param or pathname
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as NavTabId | null;
      const validTabs: NavTabId[] = [
        'dashboard',
        'systems',
        'incidents',
        'updates',
        'reports',
        'servers',
        'security',
        'notifications',
        'discussion',
        'admin',
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      } else {
        const path = window.location.pathname.replace(/^\//, '') as NavTabId;
        if (validTabs.includes(path)) {
          setActiveTab(path);
        }
      }

      const handlePopState = () => {
        const params = new URLSearchParams(window.location.search);
        const t = (params.get('tab') || 'dashboard') as NavTabId;
        if (validTabs.includes(t)) {
          setActiveTab(t);
        }
      };
      window.addEventListener('popstate', handlePopState);
    }

    let token = window.sessionStorage.getItem('gashtyar_tab_token');
    if (!token) {
      token = `tab_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      window.sessionStorage.setItem('gashtyar_tab_token', token);
    }
    setTabToken(token);
    document.cookie = `gashtyar_tab_token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;

    // Intercept client fetch to automatically attach x-tab-token for all child components
    const origFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const headers = new Headers(init?.headers || {});
      if (!headers.has('x-tab-token')) {
        headers.set('x-tab-token', token!);
      }
      return origFetch(input, { ...init, headers });
    };

    // Verify existing session
    async function checkSession() {
      try {
        const res = await fetch(`/api/auth/me`, {
          headers: { 'x-tab-token': token! },
        });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }

    checkSession();
  }, []);

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    if (!currentUser || !tabToken) return;
    setLoadingDashboard(true);
    try {
      const res = await fetch('/api/dashboard', {
        headers: { 'x-tab-token': tabToken },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setSystems(data.systems || []);
        setActiveIncidents(data.activeIncidents || []);
        setRecentActivity(data.recentActivity || []);
      } else if (res.status === 401) {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, [currentUser, tabToken]);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, fetchDashboardData]);

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.sessionStorage.removeItem('gashtyar_tab_token');
      setCurrentUser(null);
      const freshToken = `tab_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      window.sessionStorage.setItem('gashtyar_tab_token', freshToken);
      setTabToken(freshToken);
    }
  };

  // Demo Role Switching (IT Manager vs Company Management vs Auditor)
  const handleSwitchRoleForDemo = async (targetEmail: string) => {
    try {
      const reqRes = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const reqData = await reqRes.json();
      const code = reqData.devCode || '123456';

      const verifyRes = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tab-token': tabToken,
        },
        body: JSON.stringify({
          email: targetEmail,
          code,
          tabToken,
        }),
      });
      const verifyData = await verifyRes.json();
      if (verifyData.success && verifyData.user) {
        setCurrentUser(verifyData.user);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Demo switch error:', err);
    }
  };

  // Notification Send Modal Launcher
  const openManualPushNotification = (defaults?: any) => {
    setNotificationDefaults(
      defaults || {
        subject: `[Gashtyar IT Operations] Systems Update Notice`,
        summaryText: `Operational review update for company leadership.`,
        contentType: 'UPDATE',
        systemName: 'All Systems',
        statusBadge: 'Operational',
      }
    );
    setNotificationModalOpen(true);
  };

  // Loading Screen while verifying session
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <GashtyarLogo size={48} showText={false} />
        <div className="mt-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Validating Gashtyar Security Session...</span>
        </div>
      </div>
    );
  }

  // Show Email Code Verification screen if not authenticated
  if (!currentUser) {
    return (
      <AuthModal
        tabToken={tabToken}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          fetchDashboardData();
        }}
      />
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const canManageSystems = currentUser.role === 'ADMIN';

  // Filtered systems when search query is entered
  const filteredSystems = systems.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.owner.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Top Horizontal Header with integrated primary tabs */}
      <Header
        user={currentUser}
        unreadCount={metrics.activeIncidentsCount || 2}
        onLogout={handleLogout}
        onSwitchRoleForDemo={handleSwitchRoleForDemo}
        onOpenNotifications={() => handleTabChange('incidents')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Workspace Container — Full Available Screen Width */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: OVERVIEW DASHBOARD (Identical to Visual Reference) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 1. Hero Banner with Airplane Sky & Live Clock Card */}
            <HeroBanner userName={currentUser.name} />

            {/* 2. Four KPI Metric Cards (Green, Red, Blue, Amber) */}
            <MetricsRow
              metrics={metrics}
              onFilterClick={(type) => {
                if (type === 'systems') handleTabChange('systems');
                else if (type === 'incidents') handleTabChange('incidents');
                else if (type === 'updates') handleTabChange('updates');
                else if (type === 'overdue') handleTabChange('incidents');
              }}
            />

            {/* 3. Reference Dashboard Layout: Systems 6-grid + Middle 3-Card Row + Bottom 2-Col Row */}
            <DashboardSections
              systems={filteredSystems}
              metrics={metrics}
              activeIncidents={activeIncidents}
              canManageSystems={canManageSystems}
              onViewDetails={(s) => setSelectedDrawerSystem(s)}
              onOpenComments={(s) => setSelectedDrawerSystem(s)}
              onEditSystem={(s) => {
                setEditingSystem(s);
                setSystemEditModalOpen(true);
              }}
              onNavigateTab={(tab) => handleTabChange(tab as NavTabId)}
            />
          </div>
        )}

        {/* TAB 2: SYSTEMS & SERVICES */}
        {activeTab === 'systems' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Systems & Services Architecture</h2>
                <p className="text-xs text-slate-500">
                  Real-time operational status, business impact analysis, technical stacks, and dedicated discussions.
                </p>
              </div>

              {canManageSystems && (
                <button
                  onClick={() => {
                    setEditingSystem(null);
                    setSystemEditModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add System</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSystems.map((sys) => (
                <SystemCard
                  key={sys.id}
                  system={sys}
                  isAdmin={canManageSystems}
                  onViewDetails={(s) => setSelectedDrawerSystem(s)}
                  onOpenComments={(s) => setSelectedDrawerSystem(s)}
                  onEditSystem={(s) => {
                    setEditingSystem(s);
                    setSystemEditModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INCIDENTS */}
        {activeTab === 'incidents' && (
          <IncidentsTab
            isAdmin={isAdmin}
            systems={systems}
            onNewIncident={() => {
              setEditingIncident(null);
              setIncidentModalOpen(true);
            }}
            onEditIncident={(inc) => {
              setEditingIncident(inc);
              setIncidentModalOpen(true);
            }}
          />
        )}

        {/* TAB 4: RELEASES & UPDATES */}
        {activeTab === 'updates' && (
          <UpdatesTab
            isAdmin={isAdmin}
            systems={systems}
            onNewUpdate={() => setUpdateModalOpen(true)}
            onSendNotificationForUpdate={(upd) => {
              openManualPushNotification({
                subject: `[Update] ${upd.title} ${upd.version ? `(${upd.version})` : ''}`,
                summaryText: `${upd.description}\n\nTechnical Changes:\n${upd.technical_changes || 'Internal modifications'}\n\nBusiness Benefit:\n${upd.business_benefit || 'Enhances operational efficiency'}`,
                contentType: 'UPDATE',
                referenceId: upd.id,
                systemName: upd.systems_names || 'Gashtyar Systems',
                statusBadge: upd.status,
              });
            }}
          />
        )}

        {/* TAB 5: EMAIL NOTIFICATIONS & LOGS (Accessible to Managers in Read-Only) */}
        {activeTab === 'notifications' && (
          <EmailLogsTab
            isAdmin={isAdmin}
            onOpenNewNotification={() => openManualPushNotification()}
            onOpenSmtpSettings={() => setActiveTab('admin')}
          />
        )}

        {/* TAB 6: SERVERS & BACKUPS */}
        {activeTab === 'servers' && <ServersTab isAdmin={isAdmin} />}

        {/* TAB 7: CYBERSECURITY */}
        {activeTab === 'security' && <SecurityTab isAdmin={isAdmin} />}

        {/* TAB 8: MANAGEMENT DISCUSSIONS */}
        {activeTab === 'discussion' && (
          <DiscussionSection currentUser={currentUser} isAdmin={isAdmin} systems={systems} />
        )}

        {/* TAB 9: REPORTS */}
        {activeTab === 'reports' && <ReportsTab />}

        {/* TAB 10: SETTINGS (Full admin for IT Manager, read-only for Management) */}
        {activeTab === 'admin' && <AdminUsersTab isAdmin={isAdmin} />}
      </main>

      {/* 4. Footer — Matching Visual Reference */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-3.5">
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <GashtyarLogo size={18} showText={false} />
            <span className="font-bold text-slate-800">Gashtyar IT Operations</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500">Confidential Management Portal</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Baghdad time (UTC+03:00)</span>
            <span className="text-slate-300">&bull;</span>
            <span className="font-mono text-slate-400">v1.4.2</span>
          </div>
        </div>
      </footer>

      {/* Modals & Full Deep Detail Drawers */}
      {selectedDrawerSystem && (
        <SystemDrawer
          system={selectedDrawerSystem}
          onClose={() => setSelectedDrawerSystem(null)}
          currentUser={currentUser}
          isAdmin={canManageSystems}
          onEditSystem={(s) => {
            setSelectedDrawerSystem(null);
            setEditingSystem(s);
            setSystemEditModalOpen(true);
          }}
        />
      )}

      {incidentModalOpen && (
        <IncidentModal
          isOpen={incidentModalOpen}
          onClose={() => setIncidentModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
          }}
          incident={editingIncident}
          systems={systems}
          currentUser={currentUser}
        />
      )}

      {updateModalOpen && (
        <UpdateModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
          }}
          systems={systems}
          currentUser={currentUser}
          onOpenNotificationModal={(data) => openManualPushNotification(data)}
        />
      )}

      {notificationModalOpen && (
        <NotificationSendModal
          isOpen={notificationModalOpen}
          onClose={() => setNotificationModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
          }}
          defaultSubject={notificationDefaults.subject}
          defaultSummary={notificationDefaults.summaryText}
          contentType={notificationDefaults.contentType}
          referenceId={notificationDefaults.referenceId}
          systemName={notificationDefaults.systemName}
          statusBadge={notificationDefaults.statusBadge}
          etaText={notificationDefaults.etaText}
          currentUser={currentUser}
        />
      )}

      {systemEditModalOpen && (
        <SystemEditModal
          isOpen={systemEditModalOpen}
          onClose={() => setSystemEditModalOpen(false)}
          onSuccess={() => {
            fetchDashboardData();
          }}
          system={editingSystem}
        />
      )}
    </div>
  );
}
