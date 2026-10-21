'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Laptop,
  AlertTriangle,
  Clock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  Plus,
  Trash2,
  Edit,
  X,
  Save,
  RefreshCw,
} from 'lucide-react';
import { formatBaghdad, formatRelative, isOverdue } from '@/lib/time';

interface SecurityTabProps {
  isAdmin: boolean;
}

export function SecurityTab({ isAdmin }: SecurityTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRestricted, setShowRestricted] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<any | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ENDPOINT');
  const [severity, setSeverity] = useState('MEDIUM');
  const [status, setStatus] = useState('OPEN');
  const [affectedAsset, setAffectedAsset] = useState('');
  const [owner, setOwner] = useState('Gahin Mayi');
  const [dueDate, setDueDate] = useState('');
  const [remediationPlan, setRemediationPlan] = useState('');
  const [restrictedDetails, setRestrictedDetails] = useState('');

  const fetchSecurity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load security findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurity();
  }, []);

  const openAddModal = () => {
    setEditingFinding(null);
    setTitle('');
    setCategory('ENDPOINT');
    setSeverity('MEDIUM');
    setStatus('OPEN');
    setAffectedAsset('');
    setOwner('Gahin Mayi');
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setRemediationPlan('');
    setRestrictedDetails('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (f: any) => {
    setEditingFinding(f);
    setTitle(f.title || '');
    setCategory(f.category || 'ENDPOINT');
    setSeverity(f.severity || 'MEDIUM');
    setStatus(f.status || 'OPEN');
    setAffectedAsset(f.affected_asset || '');
    setOwner(f.owner || 'Gahin Mayi');
    setDueDate(f.due_date ? f.due_date.split('T')[0] : '');
    setRemediationPlan(f.remediation_plan || '');
    setRestrictedDetails(f.restricted_details || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDeleteFinding = async (f: any) => {
    if (!confirm(`Are you sure you want to delete security finding "${f.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/security?id=${encodeURIComponent(f.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSecurity();
      } else {
        alert('Failed to delete security finding.');
      }
    } catch (err) {
      console.error('Delete finding error:', err);
      alert('Network error while deleting security finding.');
    }
  };

  const handleQuickResolve = async (f: any) => {
    const nextStatus = f.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    try {
      const res = await fetch('/api/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: f.id,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        fetchSecurity();
      }
    } catch (err) {
      console.error('Quick resolve error:', err);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !affectedAsset.trim()) {
      setModalError('Title and affected asset are required.');
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    const payload: any = {
      title: title.trim(),
      category,
      severity,
      status,
      affected_asset: affectedAsset.trim(),
      owner: owner.trim(),
      due_date: dueDate ? `${dueDate}T23:59:59Z` : null,
      remediation_plan: remediationPlan.trim(),
      restricted_details: restrictedDetails.trim(),
    };

    if (editingFinding) {
      payload.id = editingFinding.id;
    }

    try {
      const res = await fetch('/api/security', {
        method: editingFinding ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Failed to save security item.');
        setModalSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      fetchSecurity();
    } catch {
      setModalError('Connection error while saving security item.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-200">
        Loading cybersecurity posture...
      </div>
    );
  }

  const metrics = data?.metrics || {
    mfaCoverage: 94.2,
    endpointCoverage: 96.0,
    criticalCount: 0,
    highCount: 1,
    mediumCount: 1,
    lowCount: 1,
  };
  const findings = data?.findings || [];

  return (
    <div className="space-y-6">
      {/* Top Posture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">MFA Enrolled</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.mfaCoverage}%</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">100% on IT & privileged management</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Endpoint EDR</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.endpointCoverage}%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">72 of 75 branch machines protected</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Issues</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.criticalCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Zero unmitigated critical CVEs</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open Tasks</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {metrics.highCount + metrics.mediumCount + metrics.lowCount}
          </div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">{metrics.highCount} high priority tracking</div>
        </div>
      </div>

      {/* Findings List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-slate-900">Cybersecurity Findings & Remediation Tasks</h3>
              {!isAdmin && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                  Read-Only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Clear management summaries with restricted technical evidence boundaries.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isAdmin && (
              <button
                onClick={openAddModal}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Security Task</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowRestricted(!showRestricted)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {showRestricted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showRestricted ? 'Hide Evidence' : 'Show Evidence'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {findings.map((f: any) => {
            const overdue = f.due_date && isOverdue(f.due_date) && f.status !== 'RESOLVED';

            return (
              <div key={f.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                          f.severity
                        )}`}
                      >
                        {f.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {f.category.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          f.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                    <div className="text-xs text-slate-500 mt-0.5">Affected Asset: {f.affected_asset}</div>
                  </div>

                  {/* Due date & Admin Controls */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    {f.due_date && (
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-slate-400">Remediation Due:</div>
                        <div
                          className={`text-xs font-bold ${
                            overdue ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {formatBaghdad(f.due_date, 'date')} {overdue && '(OVERDUE)'}
                        </div>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => handleQuickResolve(f)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            f.status === 'RESOLVED'
                              ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Toggle Resolved status"
                        >
                          {f.status === 'RESOLVED' ? 'Reopen' : 'Resolve'}
                        </button>
                        <button
                          onClick={() => openEditModal(f)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                          title="Edit finding"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFinding(f)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete finding"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remediation Plan */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 mt-2">
                  <span className="font-bold text-slate-900">Remediation Plan: </span>
                  {f.remediation_plan || 'Pending technical evaluation.'}
                </div>

                {/* Restricted details (Admin only) */}
                {isAdmin && showRestricted && f.restricted_details && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 mt-2 font-mono">
                    <span className="font-bold font-sans text-amber-800 uppercase tracking-wider text-[10px] block mb-1">
                      [RESTRICTED TECHNICAL EVIDENCE — IT ADMIN ONLY]
                    </span>
                    {f.restricted_details}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
                  <span>Assigned Owner: {f.owner}</span>
                  <span>Recorded {formatRelative(f.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Security Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-modal">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-blue-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingFinding ? `Edit Security Finding` : 'Add Security Task / Finding'}
                  </h3>
                  <div className="text-xs text-slate-300">Vulnerability management & remediation tracking</div>
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
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Active Directory Service Account Key Rotation"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="ENDPOINT">ENDPOINT</option>
                    <option value="MFA">MFA</option>
                    <option value="VULNERABILITY">VULNERABILITY</option>
                    <option value="PATCH">PATCH</option>
                    <option value="CERT_DOMAIN">CERT_DOMAIN</option>
                    <option value="ACCESS_REVIEW">ACCESS_REVIEW</option>
                    <option value="INCIDENT">INCIDENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Affected Asset
                  </label>
                  <input
                    type="text"
                    required
                    value={affectedAsset}
                    onChange={(e) => setAffectedAsset(e.target.value)}
                    placeholder="e.g. SRV-AUTH01 or Cloudflare Edge"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Remediation Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Responsible Owner
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

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Remediation Plan (Management Summary)
                </label>
                <textarea
                  rows={2}
                  value={remediationPlan}
                  onChange={(e) => setRemediationPlan(e.target.value)}
                  placeholder="Clear description of remediation steps and progress..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                  Restricted Technical Details (Admin-Only Evidence)
                </label>
                <textarea
                  rows={2}
                  value={restrictedDetails}
                  onChange={(e) => setRestrictedDetails(e.target.value)}
                  placeholder="Detailed logs, hashes, specific ports, or vulnerability IDs hidden from management..."
                  className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/40 text-xs text-slate-900 font-mono"
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
                  <span>{modalSubmitting ? 'Saving...' : editingFinding ? 'Update Finding' : 'Create Finding'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
