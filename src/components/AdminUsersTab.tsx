'use client';

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Settings as SettingsIcon,
  Mail,
  Send,
  Lock,
  RefreshCw,
  Building,
  Clock,
  Layers,
  KeyRound,
  FileText,
  Sliders,
  Check,
  Trash2,
} from 'lucide-react';
import { formatBaghdad, formatRelative } from '@/lib/time';

interface SettingsTabProps {
  isAdmin?: boolean;
}

export function AdminUsersTab({ isAdmin = false }: SettingsTabProps) {
  const [activeSettingsSection, setActiveSettingsSection] = useState<
    'general' | 'users' | 'smtp' | 'security' | 'audit'
  >('general');

  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Gashtyar Travel & Tourism LLC',
    hq: 'Baghdad, Al-Mansour, District 602, Iraq',
    timezone: 'Asia/Baghdad (UTC+03:00)',
    primaryContact: 'it.admin@gashtyar.com',
    portalVersion: 'v2.4.0-enterprise',
  });

  const [securityPolicies, setSecurityPolicies] = useState({
    sessionTimeoutMinutes: 15,
    maxSessionHours: 8,
    twoFactorMethod: 'Email 6-digit cryptographic challenge',
    authCodeExpiryMinutes: 10,
    ipTrackingEnabled: true,
    auditLogRetentionDays: 365,
  });

  // Invite User Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MANAGER' | 'VIEWER'>('MANAGER');
  const [inviteDept, setInviteDept] = useState('Operations');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // SMTP Settings State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [smtpTestSendingEmail, setSmtpTestSendingEmail] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
        setAuditLogs(json.auditLogs || []);
      }

      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const json = await settingsRes.json();
        if (json.company) setCompanyInfo(json.company);
        if (json.securityPolicies) setSecurityPolicies(json.securityPolicies);
        if (json.smtp) {
          setSmtpHost(json.smtp.host || '');
          setSmtpPort(String(json.smtp.port || 587));
          setSmtpUser(json.smtp.user || '');
          setSmtpFrom(json.smtp.from || '');
          setSmtpSecure(json.smtp.secure || false);
        }
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError('Email and full name are required.');
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          name: inviteName.trim(),
          role: inviteRole,
          department: inviteDept.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Failed to invite user.');
        setInviteSubmitting(false);
        return;
      }

      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      fetchData();
    } catch {
      setInviteError('Connection error while inviting user.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    if (!isAdmin) return;
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const confirmText =
      newStatus === 'INACTIVE'
        ? `Are you sure you want to deactivate ${user.name}? This will immediately terminate all active sessions.`
        : `Reactivate access for ${user.name}?`;

    if (!confirm(confirmText)) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!isAdmin) return;
    const confirmText = `Are you sure you want to permanently delete user "${user.name}" (${user.email})? This action cannot be undone.`;
    if (!confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Error deleting user.');
    }
  };

  const handleTestSmtp = async (withLiveEmail = false) => {
    if (!isAdmin) return;
    if (withLiveEmail) {
      if (!testRecipientEmail.trim()) {
        setSmtpFeedback({ success: false, message: 'Please enter a test recipient email address.' });
        return;
      }
      setSmtpTestSendingEmail(true);
    } else {
      setSmtpTesting(true);
    }
    setSmtpFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: Number(smtpPort),
          user: smtpUser.trim(),
          pass: smtpPass,
          from: smtpFrom.trim(),
          secure: smtpSecure,
          testOnly: true,
          testRecipient: withLiveEmail ? testRecipientEmail.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpFeedback({ success: true, message: data.message || 'SMTP connection verified successfully!' });
      } else {
        setSmtpFeedback({ success: false, message: data.error || 'SMTP verification failed.' });
      }
    } catch {
      setSmtpFeedback({ success: false, message: 'Connection error while testing SMTP.' });
    } finally {
      setSmtpTesting(false);
      setSmtpTestSendingEmail(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSmtpSaving(true);
    setSmtpFeedback(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: Number(smtpPort),
          user: smtpUser.trim(),
          pass: smtpPass,
          from: smtpFrom.trim(),
          secure: smtpSecure,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSmtpFeedback({ success: true, message: 'SMTP settings saved successfully.' });
        setSmtpPass('');
      } else {
        setSmtpFeedback({ success: false, message: data.error || 'Failed to save settings.' });
      }
    } catch {
      setSmtpFeedback({ success: false, message: 'Error saving settings.' });
    } finally {
      setSmtpSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Platform Settings & User Directory</h2>
            {!isAdmin ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-600" />
                Management View (Read-Only)
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-600" />
                IT Manager Administrative Control
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Company configuration, role management, security policies, and transparent system audit logs.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Settings Navigation Sub-tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-2xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSettingsSection('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsSection === 'general'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>General & Company</span>
        </button>

        <button
          onClick={() => setActiveSettingsSection('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsSection === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>User Accounts & Roles ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSettingsSection('smtp')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsSection === 'smtp'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email Delivery (SMTP)</span>
        </button>

        <button
          onClick={() => setActiveSettingsSection('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsSection === 'security'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Security & Sessions</span>
        </button>

        <button
          onClick={() => setActiveSettingsSection('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsSection === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* SECTION 1: GENERAL & COMPANY */}
      {activeSettingsSection === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Company Information
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Company Legal Entity</span>
                <span className="font-bold text-slate-900 text-sm">{companyInfo.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Headquarters Location</span>
                <span className="font-medium text-slate-800">{companyInfo.hq}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">Operating Timezone</span>
                <span className="font-bold text-blue-700">{companyInfo.timezone}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px]">IT Operations Desk Contact</span>
                <span className="font-medium text-slate-800">{companyInfo.primaryContact}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              System Architecture Categories
            </h3>
            <p className="text-xs text-slate-500">
              Active technology classifications tracked across Gashtyar travel operations:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                'Wholesale Booking Engine',
                'Flight Distribution & GDS',
                'Partner Portal',
                'Integration Engine',
                'Internal Operations',
                'Public Presence',
              ].map((cat, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: USERS & ROLES */}
      {activeSettingsSection === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registered Platform Users</h3>
              <p className="text-xs text-slate-500">
                Role-based access accounts for IT Administration and Company Leadership.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite New User</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Name & Email</th>
                  <th className="px-5 py-3">Assigned Role</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Account Status</th>
                  <th className="px-5 py-3">Created</th>
                  {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-slate-500 text-[11px] font-mono">{u.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          u.role === 'ADMIN'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : u.role === 'MANAGER'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {u.role === 'ADMIN' ? 'IT Manager (Super Admin)' : u.role === 'MANAGER' ? 'Management (Read-Only)' : 'Auditor (Viewer)'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{u.department || 'Operations'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <XCircle className="w-3 h-3 text-red-600" />}
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      {formatRelative(u.created_at)}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                              u.status === 'ACTIVE'
                                ? 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'bg-white border-green-200 text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title={`Delete ${u.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: SMTP EMAIL CONFIGURATION */}
      {activeSettingsSection === 'smtp' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">SMTP Email Gateway Settings</h3>
              <p className="text-xs text-slate-500">
                Official outbound email delivery server for manual management notices and verification codes.
              </p>
            </div>
            {!isAdmin && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Read-Only
              </span>
            )}
          </div>

          {smtpFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                smtpFeedback.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {smtpFeedback.success ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
              <span>{smtpFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">SMTP Host</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gashtyar.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Port</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono disabled:opacity-70"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Username / Account</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="notifications@gashtyar.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Password</label>
                <input
                  type="password"
                  disabled={!isAdmin}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={isAdmin ? '••••••••••••••••' : '•••••••• (Masked)'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:opacity-70"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">From Sender Address</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
                placeholder="Gashtyar IT Operations <it-ops@gashtyar.com>"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:opacity-70"
              />
            </div>

            {isAdmin && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Live Test Email Delivery (Test What Users Receive)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={testRecipientEmail}
                    onChange={(e) => setTestRecipientEmail(e.target.value)}
                    placeholder="Enter your email to receive a live test message..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTestSmtp(true)}
                    disabled={smtpTestSendingEmail || smtpTesting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{smtpTestSendingEmail ? 'Sending...' : 'Send Live Test Email'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Sends an actual branded HTML test email to this address to verify mailbox reception and spam filter compatibility.
                </p>
              </div>
            )}

            {isAdmin && (
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleTestSmtp(false)}
                  disabled={smtpTesting || smtpTestSendingEmail}
                  className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {smtpTesting ? 'Testing...' : 'Verify Connection Only'}
                </button>

                <button
                  type="submit"
                  disabled={smtpSaving}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  {smtpSaving ? 'Saving...' : 'Save SMTP Settings'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* SECTION 4: SECURITY & SESSIONS */}
      {activeSettingsSection === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Security & Authentication Policies
          </h3>
          <p className="text-xs text-slate-500">
            Strict session isolation and cryptographic OTP verification requirements:
          </p>

          <div className="space-y-3 divide-y divide-slate-100 text-xs">
            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Inactivity Session Timeout</span>
                <p className="text-[11px] text-slate-500">Automatically ends idle browser tabs to safeguard sensitive dashboards.</p>
              </div>
              <span className="font-mono font-bold text-blue-700">{securityPolicies.sessionTimeoutMinutes} Minutes</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Absolute Session Lifetime</span>
                <p className="text-[11px] text-slate-500">Forces complete re-verification challenge regardless of activity.</p>
              </div>
              <span className="font-mono font-bold text-slate-700">{securityPolicies.maxSessionHours} Hours Max</span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Verification Challenge Mechanism</span>
                <p className="text-[11px] text-slate-500">SHA-256 hashed 6-digit challenge delivered exclusively to user email.</p>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-green-50 text-green-700 font-bold border border-green-200">
                Active & Enforced
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800">Secret Token Masking</span>
                <p className="text-[11px] text-slate-500">Ensures API tokens and passwords never render in plaintext for management users.</p>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Enforced at API Level
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: AUDIT LOGS */}
      {activeSettingsSection === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Platform Audit Logs & Action Transparency</h3>
              <p className="text-xs text-slate-500">
                Immutable chronological log of all system changes, incident updates, releases, and notifications.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp (Baghdad)</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Actor Email</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatBaghdad(log.created_at, 'full')}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-semibold">{log.entity_type}</td>
                    <td className="px-5 py-3 text-slate-800 font-medium">{log.user_email || 'System'}</td>
                    <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-modal">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-blue-600">
              <h3 className="text-base font-bold">Invite Platform User</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="p-5 space-y-3">
              {inviteError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {inviteError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Hersh Ahmed"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Company Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@gashtyar.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Role Assignment</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="MANAGER">Gashtyar Management (Monitoring & Comments)</option>
                  <option value="ADMIN">IT Manager (Super Admin)</option>
                  <option value="VIEWER">Auditor (Read-Only Viewer)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
                <input
                  type="text"
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                  placeholder="Executive Management"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {inviteSubmitting ? 'Inviting...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
