'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  ShieldAlert,
  Server,
  FileText,
} from 'lucide-react';
import { nowUtc, formatBaghdad } from '@/lib/time';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  incident?: any | null; // null for new, object for edit
  systems: { id: string; name: string }[];
  currentUser: { id: string; name: string };
}

export function IncidentModal({
  isOpen,
  onClose,
  onSuccess,
  incident,
  systems,
  currentUser,
}: IncidentModalProps) {
  const isEdit = Boolean(incident);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [priority, setPriority] = useState('P2');
  const [businessImpact, setBusinessImpact] = useState('');
  const [assignedOwner, setAssignedOwner] = useState(currentUser.name || 'Gahin Mayi');
  const [status, setStatus] = useState('OPEN');
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
  const [isUnderAssessment, setIsUnderAssessment] = useState(false);
  const [etaDate, setEtaDate] = useState('');
  const [etaLabel, setEtaLabel] = useState('Estimate');
  const [nextUpdateDue, setNextUpdateDue] = useState('');
  const [etaChangeReason, setEtaChangeReason] = useState('');
  const [timelineUpdateMessage, setTimelineUpdateMessage] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [preventiveActions, setPreventiveActions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (incident) {
      setTitle(incident.title || '');
      setDescription(incident.description || '');
      setTechnicalNotes(incident.technical_notes || '');
      setSeverity(incident.severity || 'HIGH');
      setPriority(incident.priority || 'P2');
      setBusinessImpact(incident.business_impact || '');
      setAssignedOwner(incident.assigned_owner || currentUser.name);
      setStatus(incident.status || 'INVESTIGATING');
      setIsUnderAssessment(incident.is_under_assessment === 1);
      setEtaDate(incident.eta_date ? incident.eta_date.slice(0, 16) : '');
      setEtaLabel(incident.eta_label || 'Estimate');
      setNextUpdateDue(incident.next_update_due ? incident.next_update_due.slice(0, 16) : '');
      setResolutionSummary(incident.resolution_summary || '');
      setRootCause(incident.root_cause || '');
      setPreventiveActions(incident.preventive_actions || '');
      setEtaChangeReason('');
      setTimelineUpdateMessage('');

      const ids = incident.affected_system_ids ? incident.affected_system_ids.split(',') : [];
      setSelectedSystemIds(ids);
    } else {
      setTitle('');
      setDescription('');
      setTechnicalNotes('');
      setSeverity('HIGH');
      setPriority('P2');
      setBusinessImpact('');
      setAssignedOwner(currentUser.name || 'Gahin Mayi');
      setStatus('OPEN');
      setIsUnderAssessment(false);
      setEtaDate('');
      setEtaLabel('Estimate');
      setNextUpdateDue('');
      setResolutionSummary('');
      setRootCause('');
      setPreventiveActions('');
      setEtaChangeReason('');
      setTimelineUpdateMessage('');
      setSelectedSystemIds(systems.length > 0 ? [systems[0].id] : []);
    }
  }, [isOpen, incident, currentUser, systems]);

  if (!isOpen) return null;

  const toggleSystem = (id: string) => {
    if (selectedSystemIds.includes(id)) {
      setSelectedSystemIds(selectedSystemIds.filter((s) => s !== id));
    } else {
      setSelectedSystemIds([...selectedSystemIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignedOwner.trim()) {
      setError('Title and Assigned Owner are required.');
      return;
    }
    if (!isEdit && selectedSystemIds.length === 0) {
      setError('Please select at least one affected system.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      technical_notes: technicalNotes.trim(),
      severity,
      priority,
      business_impact: businessImpact.trim(),
      assigned_owner: assignedOwner.trim(),
      status,
      is_under_assessment: isUnderAssessment,
      eta_date: isUnderAssessment ? null : etaDate ? new Date(etaDate).toISOString() : null,
      eta_label: etaLabel,
      next_update_due: nextUpdateDue ? new Date(nextUpdateDue).toISOString() : null,
      resolution_summary: resolutionSummary.trim() || null,
      root_cause: rootCause.trim() || null,
      preventive_actions: preventiveActions.trim() || null,
    };

    if (isEdit) {
      payload.id = incident.id;
      payload.eta_change_reason = etaChangeReason.trim();
      payload.timeline_update_message = timelineUpdateMessage.trim();
    } else {
      payload.affected_system_ids = selectedSystemIds;
    }

    try {
      const res = await fetch('/api/incidents', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save incident.');
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('Connection error while saving incident.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-modal">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-red-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEdit ? `Update Incident: ${incident.incident_ref}` : 'Report Technical Incident'}
              </h2>
              <div className="text-xs text-slate-300">
                Live technical coordination &bull; Accurate workflow stages
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Incident Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sabre GDS Latency Spike on Flight Search"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Affected Systems Selection (Multi-select) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Affected Systems
            </label>
            <div className="flex flex-wrap gap-2">
              {systems.map((s) => {
                const isSelected = selectedSystemIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSystem(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-red-50 text-red-700 border-red-300 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity, Priority, Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="CRITICAL">Critical (Total Outage)</option>
                <option value="HIGH">High (Major Degradation)</option>
                <option value="MEDIUM">Medium (Partial Impact)</option>
                <option value="LOW">Low (Minor Glitch)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="P1">P1 — Immediate Response</option>
                <option value="P2">P2 — Urgent Fix</option>
                <option value="P3">P3 — Standard Escalation</option>
                <option value="P4">P4 — Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Workflow Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
              >
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_SUPPLIER">Waiting for Supplier</option>
                <option value="MONITORING">Monitoring</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Assigned Owner & Business Impact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Assigned Technical Owner
              </label>
              <input
                type="text"
                required
                value={assignedOwner}
                onChange={(e) => setAssignedOwner(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Business Impact Summary
              </label>
              <input
                type="text"
                value={businessImpact}
                onChange={(e) => setBusinessImpact(e.target.value)}
                placeholder="e.g. Flight checkout functional; search latency elevated"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Estimated Resolution Time (ETA) Controls */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Estimated Resolution Time (ETA)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={isUnderAssessment}
                  onChange={(e) => setIsUnderAssessment(e.target.checked)}
                  className="rounded text-blue-600 border-slate-300"
                />
                <span>Under assessment (ETA unknown)</span>
              </label>
            </div>

            {!isUnderAssessment && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Estimated Date/Time (Baghdad):</span>
                  <input
                    type="datetime-local"
                    value={etaDate}
                    onChange={(e) => setEtaDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Label (Clearly states Estimate):</span>
                  <input
                    type="text"
                    value={etaLabel}
                    onChange={(e) => setEtaLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white mt-1"
                  />
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] text-slate-500 font-medium">Next Management Update Due:</span>
              <input
                type="datetime-local"
                value={nextUpdateDue}
                onChange={(e) => setNextUpdateDue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white mt-1"
              />
            </div>

            {isEdit && (
              <div>
                <span className="text-[11px] text-slate-700 font-bold">ETA Change Reason (Logged in History):</span>
                <input
                  type="text"
                  value={etaChangeReason}
                  onChange={(e) => setEtaChangeReason(e.target.value)}
                  placeholder="e.g. Upstream vendor extended maintenance window"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white mt-1"
                />
              </div>
            )}
          </div>

          {/* Description & Technical Findings */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Incident Description & Business Symptoms
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe symptoms, affected components, and current impact..."
              className="w-full p-3.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Technical Investigation Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Technical Investigation Notes & Diagnostics
            </label>
            <textarea
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Internal diagnostics, logs, error codes, and technical findings..."
              className="w-full p-3.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Timeline Update Message for edits */}
          {isEdit && (
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Timeline Progress Note (Appended to Chronological History)
              </label>
              <input
                type="text"
                value={timelineUpdateMessage}
                onChange={(e) => setTimelineUpdateMessage(e.target.value)}
                placeholder="e.g. Secondary routing gateway enabled; latency reduced to 1.2s"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900"
              />
            </div>
          )}

          {/* Resolution Details when status is RESOLVED */}
          {status === 'RESOLVED' && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200 space-y-3">
              <div className="text-xs font-bold text-green-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Incident Resolution & Prevention</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-green-800">Resolution Summary:</span>
                <textarea
                  rows={2}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Explain how the incident was resolved..."
                  className="w-full p-2.5 rounded-lg border border-green-300 text-xs text-slate-900 bg-white mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-semibold text-green-800">Root Cause:</span>
                  <input
                    type="text"
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="e.g. Memory leak in gateway connection pool"
                    className="w-full px-3 py-2 rounded-lg border border-green-300 text-xs text-slate-900 bg-white mt-1"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-green-800">Preventive Actions:</span>
                  <input
                    type="text"
                    value={preventiveActions}
                    onChange={(e) => setPreventiveActions(e.target.value)}
                    placeholder="e.g. Added automated threshold alerts"
                    className="w-full px-3 py-2 rounded-lg border border-green-300 text-xs text-slate-900 bg-white mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving Incident...' : isEdit ? 'Save Changes' : 'Log Technical Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
