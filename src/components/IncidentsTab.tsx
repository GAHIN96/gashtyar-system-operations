'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Plus,
  Server,
  User,
  Search,
  ChevronDown,
  History,
  ShieldAlert,
  MessageSquare,
  Send,
  HelpCircle,
  FileCode,
  CornerDownRight,
  Lock,
  Trash2,
} from 'lucide-react';
import { formatBaghdad, formatRelative, isOverdue } from '@/lib/time';

interface IncidentsTabProps {
  onNewIncident: () => void;
  onEditIncident: (incident: any) => void;
  isAdmin: boolean;
  systems: { id: string; name: string }[];
  refreshTrigger?: number;
}

export function IncidentsTab({
  onNewIncident,
  onEditIncident,
  isAdmin,
  systems,
  refreshTrigger = 0,
}: IncidentsTabProps) {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [systemFilter, setSystemFilter] = useState('');
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

  // Discussion state per incident
  const [openCommentsIncidentId, setOpenCommentsIncidentId] = useState<string | null>(null);
  const [incidentComments, setIncidentComments] = useState<{ [incidentId: string]: any[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [incidentId: string]: string }>({});
  const [requestUpdateFlags, setRequestUpdateFlags] = useState<{ [incidentId: string]: boolean }>({});
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (systemFilter) params.set('systemId', systemFilter);

      const res = await fetch(`/api/incidents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, systemFilter, refreshTrigger]);

  const loadIncidentComments = async (incId: string) => {
    try {
      const res = await fetch(`/api/comments?targetType=INCIDENT&targetId=${incId}`);
      if (res.ok) {
        const data = await res.json();
        setIncidentComments((prev) => ({ ...prev, [incId]: data.comments || [] }));
      }
    } catch (err) {
      console.error('Failed to load incident comments:', err);
    }
  };

  const toggleComments = (incId: string) => {
    if (openCommentsIncidentId === incId) {
      setOpenCommentsIncidentId(null);
    } else {
      setOpenCommentsIncidentId(incId);
      loadIncidentComments(incId);
    }
  };

  const handlePostIncidentComment = async (incId: string) => {
    const text = (commentInputs[incId] || '').trim();
    if (!text) return;

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'INCIDENT',
          target_id: incId,
          content: text,
          is_request_update: Boolean(requestUpdateFlags[incId]),
        }),
      });

      if (res.ok) {
        setCommentInputs((prev) => ({ ...prev, [incId]: '' }));
        setRequestUpdateFlags((prev) => ({ ...prev, [incId]: false }));
        loadIncidentComments(incId);
      }
    } catch (err) {
      console.error('Failed to post incident comment:', err);
    } finally {
      setSubmittingComment(false);
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

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'MONITORING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PROGRESS':
      case 'FIX_IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'WAITING_FOR_SUPPLIER':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'INVESTIGATING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Filters & Action */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Technical Incident Management</h2>
            {!isAdmin && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-amber-600" />
                Read-Only (Comments Enabled)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Real-time incident response, chronological activity timeline & management update requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter supporting all 7 statuses */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Open & Investigating)</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_SUPPLIER">Waiting for Supplier</option>
            <option value="MONITORING">Monitoring</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* System Filter */}
          <select
            value={systemFilter}
            onChange={(e) => setSystemFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-2xs"
          >
            <option value="">All Systems</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Report Incident (IT Manager Only) */}
          {isAdmin && (
            <button
              onClick={onNewIncident}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-200">
            Loading incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-900">No Incidents Found</div>
            <div className="text-xs text-slate-500 mt-1">
              All monitored systems operate within healthy operational response baselines.
            </div>
          </div>
        ) : (
          incidents.map((inc) => {
            const isResolved = inc.status === 'RESOLVED' || inc.status === 'CLOSED';
            const etaOverdue = !isResolved && inc.eta_date && isOverdue(inc.eta_date);
            const updateOverdue = !isResolved && inc.next_update_due && isOverdue(inc.next_update_due);
            const isTimelineExpanded = expandedTimelineId === inc.id;
            const isCommentsOpen = openCommentsIncidentId === inc.id;
            const commentsList = incidentComments[inc.id] || [];

            return (
              <div
                key={inc.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200/60 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            {inc.incident_ref}
                          </span>
                          <h3 className="text-base font-bold text-slate-900">{inc.title}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(
                              inc.severity
                            )}`}
                          >
                            {inc.severity} ({inc.priority})
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                              inc.status
                            )}`}
                          >
                            {inc.status}
                          </span>
                        </div>

                        {/* Affected systems with custom logo */}
                        {(() => {
                          const linkedSystem = (systems as any[]).find((s) =>
                            inc.affected_systems_names?.toLowerCase().includes(s.name.toLowerCase())
                          );
                          return (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1">
                              {linkedSystem?.logo_url ? (
                                <div className="w-5 h-5 rounded-md bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                  <img
                                    src={linkedSystem.logo_url}
                                    alt={linkedSystem.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              ) : (
                                <Server className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>Affected: <strong className="text-slate-800">{inc.affected_systems_names || 'None'}</strong></span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleComments(inc.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        <span>Discussion</span>
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={() => onEditIncident(inc)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            Update Status / ETA
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to delete incident ${inc.incident_ref} ("${inc.title}")?`)) return;
                              try {
                                const res = await fetch(`/api/incidents?id=${encodeURIComponent(inc.id)}`, { method: 'DELETE' });
                                if (res.ok) {
                                  fetchIncidents();
                                } else {
                                  alert('Failed to delete incident.');
                                }
                              } catch {
                                alert('Network error while deleting incident.');
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Incident"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-3">
                    {inc.description}
                  </p>

                  {/* Technical Investigation Notes (Section 7) */}
                  {inc.technical_notes && (
                    <div className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs mb-3 space-y-1 border border-slate-800">
                      <div className="font-bold text-blue-400 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Technical Investigation Notes:</span>
                      </div>
                      <p className="whitespace-pre-line text-slate-200 leading-relaxed font-mono">
                        {inc.technical_notes}
                      </p>
                    </div>
                  )}

                  {/* ETA & Status Info Bar */}
                  <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                    {/* ETA Display */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500">Target ETA:</span>
                      {inc.is_under_assessment === 1 ? (
                        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Under assessment
                        </span>
                      ) : inc.eta_date ? (
                        <span
                          className={`font-semibold px-2 py-0.5 rounded border ${
                            etaOverdue
                              ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {inc.eta_label || 'Estimate'}: {formatBaghdad(inc.eta_date, 'short')}
                          {etaOverdue && ' (OVERDUE)'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None specified</span>
                      )}
                    </div>

                    {/* Next update due */}
                    {inc.next_update_due && !isResolved && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Next Update Due:</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded border ${
                            updateOverdue
                              ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {formatBaghdad(inc.next_update_due, 'time')} ({formatRelative(inc.next_update_due)})
                          {updateOverdue && ' (OVERDUE)'}
                        </span>
                      </div>
                    )}

                    {/* Assigned Owner */}
                    <div className="flex items-center gap-1.5 ml-auto text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Incident Commander: <strong>{inc.assigned_owner}</strong></span>
                    </div>
                  </div>

                  {/* Resolution Summary & Root Cause */}
                  {isResolved && inc.resolution_summary && (
                    <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-950 space-y-1">
                      <div>
                        <span className="font-bold text-green-900">Resolution Summary: </span>
                        {inc.resolution_summary}
                      </div>
                      {inc.root_cause && (
                        <div>
                          <span className="font-bold text-green-900">Root Cause: </span>
                          {inc.root_cause}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Discussion Thread Drawer for Incident */}
                {isCommentsOpen && (
                  <div className="p-5 bg-slate-50/70 border-t border-slate-200 space-y-3 animate-modal">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span>Incident Management Discussion ({commentsList.length})</span>
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {commentsList.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">
                          No comments on this incident yet. Managers can ask questions or request an update.
                        </div>
                      ) : (
                        commentsList.map((c: any) => (
                          <div key={c.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{c.author_name}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                  {c.author_role}
                                </span>
                                {c.is_request_update === 1 && (
                                  <span className="text-[9px] px-2 py-0.2 rounded-full bg-amber-500 text-white font-bold flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3" />
                                    Update Requested ({c.request_status || 'OPEN'})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">{formatRelative(c.created_at)}</span>
                            </div>
                            <div className="text-slate-800 leading-relaxed">{c.content}</div>

                            {c.it_response && (
                              <div className="mt-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900">
                                <span className="font-bold flex items-center gap-1 text-blue-800">
                                  <CornerDownRight className="w-3 h-3 text-blue-600" />
                                  IT Response:
                                </span>
                                <div className="mt-0.5">{c.it_response}</div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Post Comment on Incident */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-1.5 font-bold text-amber-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(requestUpdateFlags[inc.id])}
                            onChange={(e) =>
                              setRequestUpdateFlags((prev) => ({ ...prev, [inc.id]: e.target.checked }))
                            }
                            className="rounded text-amber-600"
                          />
                          <span>Request Update from IT</span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[inc.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [inc.id]: e.target.value }))
                          }
                          placeholder="Ask IT for an ETA update or add management notes..."
                          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostIncidentComment(inc.id);
                          }}
                        />
                        <button
                          onClick={() => handlePostIncidentComment(inc.id)}
                          disabled={submittingComment || !(commentInputs[inc.id] || '').trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chronological Timeline Accordion */}
                <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-2.5 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setExpandedTimelineId(isTimelineExpanded ? null : inc.id)}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-semibold cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Chronological Incident Timeline ({inc.timeline?.length || 0} entries)</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isTimelineExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Reported {formatRelative(inc.reported_at)} &bull; {formatBaghdad(inc.reported_at, 'short')}
                  </span>
                </div>

                {isTimelineExpanded && (
                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 space-y-3">
                    {inc.timeline?.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">No timeline entries recorded yet.</div>
                    ) : (
                      inc.timeline.map((item: any) => (
                        <div key={item.id} className="flex items-start gap-3 text-xs">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1.5 shrink-0 ring-4 ring-blue-100"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{item.author_name}</span>
                              <span className="text-[10px] text-slate-400">
                                {formatBaghdad(item.created_at, 'full')}
                              </span>
                            </div>
                            <div className="text-slate-700 mt-0.5">{item.message}</div>
                            {item.eta_change_reason && (
                              <div className="text-[11px] text-amber-700 italic mt-0.5">
                                Reason for ETA change: {item.eta_change_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
