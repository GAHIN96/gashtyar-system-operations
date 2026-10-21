'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Server,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Plus,
  Cpu,
  Layers,
  Database,
  Calendar,
  Trash2,
  Edit,
  X,
  Save,
  Lock,
} from 'lucide-react';
import { formatBaghdad, formatRelative } from '@/lib/time';

interface ServersTabProps {
  isAdmin: boolean;
}

export function ServersTab({ isAdmin }: ServersTabProps) {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<any | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hostingProvider, setHostingProvider] = useState('');
  const [owner, setOwner] = useState('Gahin Mayi');
  const [healthStatus, setHealthStatus] = useState('HEALTHY');
  const [databaseHealth, setDatabaseHealth] = useState('NORMAL');
  const [backupSchedule, setBackupSchedule] = useState('Daily at 02:00 Baghdad Time');
  const [backupRetention, setBackupRetention] = useState('30 Days encrypted off-site');
  const [backupResult, setBackupResult] = useState('SUCCESS');
  const [restoreOutcome, setRestoreOutcome] = useState('VERIFIED');
  const [upcomingMaintenance, setUpcomingMaintenance] = useState('');
  const [notes, setNotes] = useState('');

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servers');
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      console.error('Failed to load server assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const openAddModal = () => {
    setEditingServer(null);
    setName('');
    setPurpose('');
    setHostingProvider('Hetzner Cloud Dedicated (Frankfurt)');
    setOwner('Gahin Mayi');
    setHealthStatus('HEALTHY');
    setDatabaseHealth('NORMAL');
    setBackupSchedule('Daily at 02:00 Baghdad Time');
    setBackupRetention('30 Days encrypted off-site');
    setBackupResult('SUCCESS');
    setRestoreOutcome('VERIFIED');
    setUpcomingMaintenance('');
    setNotes('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (srv: any) => {
    setEditingServer(srv);
    setName(srv.name || '');
    setPurpose(srv.purpose || '');
    setHostingProvider(srv.hosting_provider || '');
    setOwner(srv.owner || 'Gahin Mayi');
    setHealthStatus(srv.health_status || 'HEALTHY');
    setDatabaseHealth(srv.database_health || 'NORMAL');
    setBackupSchedule(srv.backup_schedule || 'Daily at 02:00 Baghdad Time');
    setBackupRetention(srv.backup_retention || '30 Days encrypted off-site');
    setBackupResult(srv.backup_result || 'SUCCESS');
    setRestoreOutcome(srv.restore_outcome || 'VERIFIED');
    setUpcomingMaintenance(srv.upcoming_maintenance || '');
    setNotes(srv.notes || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleManualCheck = async (serverId: string) => {
    try {
      const res = await fetch('/api/servers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: serverId,
          recordManualCheck: true,
        }),
      });
      if (res.ok) {
        fetchServers();
      }
    } catch (err) {
      console.error('Failed to record manual check:', err);
    }
  };

  const handleDeleteServer = async (srv: any) => {
    if (!confirm(`Are you sure you want to delete server "${srv.name}"? This action is recorded in the security audit history.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/servers?id=${encodeURIComponent(srv.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchServers();
      } else {
        alert('Failed to delete server asset.');
      }
    } catch (err) {
      console.error('Delete server error:', err);
      alert('Network error while deleting server.');
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !purpose.trim() || !hostingProvider.trim()) {
      setModalError('Server name, purpose, and hosting provider are required.');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    const payload: any = {
      name: name.trim(),
      purpose: purpose.trim(),
      hosting_provider: hostingProvider.trim(),
      owner: owner.trim(),
      health_status: healthStatus,
      database_health: databaseHealth,
      backup_schedule: backupSchedule.trim(),
      backup_retention: backupRetention.trim(),
      backup_result: backupResult,
      restore_outcome: restoreOutcome,
      upcoming_maintenance: upcomingMaintenance.trim() || null,
      notes: notes.trim(),
    };

    if (editingServer) {
      payload.id = editingServer.id;
    }

    try {
      const res = await fetch('/api/servers', {
        method: editingServer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Failed to save server.');
        setModalSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      fetchServers();
    } catch {
      setModalError('Connection error while saving server.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'HEALTHY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MANUAL_STATUS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'STALE':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-slate-900">Infrastructure, Backups & Recovery</h2>
            {!isAdmin && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-slate-500" />
                Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Explicit separation of backup completion vs restore verification. Monitored telemetry and verified manual audits.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Server Asset</span>
            </button>
          )}

          <button
            onClick={fetchServers}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Health</span>
          </button>
        </div>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading infrastructure assets...
          </div>
        ) : (
          servers.map((srv) => (
            <div
              key={srv.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
                      <Server className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{srv.name}</h3>
                      <div className="text-xs text-slate-500 font-medium">{srv.hosting_provider}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getHealthBadge(
                        srv.effectiveHealth || srv.health_status
                      )}`}
                    >
                      {srv.effectiveHealth || srv.health_status}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(srv)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                          title="Edit server"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteServer(srv)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete server"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purpose */}
                <p className="text-xs text-slate-600 mb-4">{srv.purpose}</p>

                {/* Telemetry or Manual Check Bar */}
                {srv.cpu_percent !== null && srv.memory_percent !== null ? (
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Cpu className="w-3 h-3" /> CPU
                      </span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{srv.cpu_percent}%</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Memory
                      </span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{srv.memory_percent}%</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> Disk
                      </span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{srv.disk_percent}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 mb-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Manual Health Audit</div>
                      <div className="text-[11px] text-slate-400">
                        Last checked: {formatRelative(srv.last_check_at)} ({formatBaghdad(srv.last_check_at, 'short')})
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleManualCheck(srv.id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>
                )}

                {/* Database Health if applicable */}
                {srv.database_health && (
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      Database Cluster:
                    </span>
                    <span className="font-bold text-slate-800">{srv.database_health}</span>
                  </div>
                )}

                {/* SEPARATE Backup Completed vs Restore Verified */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                  {/* Backup Status */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        1. Backup Completed
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        {srv.backup_result || 'SUCCESS'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800">
                      {formatBaghdad(srv.last_backup_at, 'short')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{srv.backup_schedule}</div>
                  </div>

                  {/* Restore Outcome */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        2. Restore Verified
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                        {srv.restore_outcome || 'VERIFIED'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800">
                      {formatBaghdad(srv.last_restore_test_at, 'short')}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Simulated Disaster Recovery Test</div>
                  </div>
                </div>

                {/* Upcoming Maintenance */}
                {srv.upcoming_maintenance && (
                  <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900 mt-2">
                    <span className="font-bold">Scheduled Window: </span>
                    {srv.upcoming_maintenance}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Lead: {srv.owner}</span>
                <span>Retention: {srv.backup_retention}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Server Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-modal">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-blue-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingServer ? `Edit ${editingServer.name}` : 'Add Infrastructure Server'}
                  </h3>
                  <div className="text-xs text-slate-300">Server specifications, backup schedule & recovery</div>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4 max-h-[calc(88vh-80px)] overflow-y-auto">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SRV-PROD-APP01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Hosting Provider
                  </label>
                  <input
                    type="text"
                    required
                    value={hostingProvider}
                    onChange={(e) => setHostingProvider(e.target.value)}
                    placeholder="e.g. AWS Frankfurt (RDS Multi-AZ)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Responsible Lead
                  </label>
                  <input
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. Gahin Mayi"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Health Status
                  </label>
                  <select
                    value={healthStatus}
                    onChange={(e) => setHealthStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="HEALTHY">HEALTHY</option>
                    <option value="WARNING">WARNING</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="MANUAL_STATUS">MANUAL_STATUS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Database Cluster Health
                  </label>
                  <input
                    type="text"
                    value={databaseHealth}
                    onChange={(e) => setDatabaseHealth(e.target.value)}
                    placeholder="e.g. NORMAL or Multi-AZ Primary Active"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Purpose / Service Role
                </label>
                <textarea
                  rows={2}
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Primary role in company infrastructure..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Backup Schedule
                  </label>
                  <input
                    type="text"
                    value={backupSchedule}
                    onChange={(e) => setBackupSchedule(e.target.value)}
                    placeholder="Daily at 02:00 Baghdad Time"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Backup Retention
                  </label>
                  <input
                    type="text"
                    value={backupRetention}
                    onChange={(e) => setBackupRetention(e.target.value)}
                    placeholder="30 Days encrypted off-site"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Backup Result
                  </label>
                  <select
                    value={backupResult}
                    onChange={(e) => setBackupResult(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Restore Test Outcome
                  </label>
                  <select
                    value={restoreOutcome}
                    onChange={(e) => setRestoreOutcome(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Scheduled Maintenance Window
                </label>
                <input
                  type="text"
                  value={upcomingMaintenance}
                  onChange={(e) => setUpcomingMaintenance(e.target.value)}
                  placeholder="e.g. Next Sunday 03:00 - 04:00 AM (Kernel security patch)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{modalSubmitting ? 'Saving...' : editingServer ? 'Update Server' : 'Add Server'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
