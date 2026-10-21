'use client';

import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Plus,
  Search,
  Filter,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Server,
  User,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileCode,
  Layers,
  Send,
  Eye,
  Trash2,
} from 'lucide-react';
import { formatBaghdad, formatRelative } from '@/lib/time';

interface UpdatesTabProps {
  onNewUpdate: () => void;
  onSendNotificationForUpdate: (update: any) => void;
  isAdmin: boolean;
  systems: { id: string; name: string }[];
  refreshTrigger?: number;
}

export function UpdatesTab({
  onNewUpdate,
  onSendNotificationForUpdate,
  isAdmin,
  systems,
  refreshTrigger = 0,
}: UpdatesTabProps) {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [systemFilter, setSystemFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedUpdateId, setExpandedUpdateId] = useState<string | null>(null);

  // Update discussion state
  const [selectedUpdateComments, setSelectedUpdateComments] = useState<{ [updateId: string]: any[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [updateId: string]: string }>({});
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (systemFilter) params.set('systemId', systemFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/updates?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
      }
    } catch (err) {
      console.error('Failed to fetch updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [typeFilter, systemFilter, refreshTrigger]);

  const fetchCommentsForUpdate = async (updateId: string) => {
    try {
      const res = await fetch(`/api/comments?targetType=UPDATE&targetId=${updateId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUpdateComments((prev) => ({ ...prev, [updateId]: data.comments || [] }));
      }
    } catch (err) {
      console.error('Failed to load update comments:', err);
    }
  };

  const toggleExpand = (upd: any) => {
    if (expandedUpdateId === upd.id) {
      setExpandedUpdateId(null);
    } else {
      setExpandedUpdateId(upd.id);
      fetchCommentsForUpdate(upd.id);
    }
  };

  const handlePostUpdateComment = async (updateId: string) => {
    const text = (commentInputs[updateId] || '').trim();
    if (!text) return;

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'UPDATE',
          target_id: updateId,
          content: text,
        }),
      });

      if (res.ok) {
        setCommentInputs((prev) => ({ ...prev, [updateId]: '' }));
        fetchCommentsForUpdate(updateId);
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUpdates();
  };

  const getTypeBadge = (t: string) => {
    switch (t) {
      case 'NEW_FEATURE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IMPROVEMENT':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'BUG_FIX':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MAINTENANCE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Releases & System Updates</h2>
          <p className="text-xs text-slate-500">
            Official deployment log, technical changes, publisher verification & leadership discussion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search updates..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 w-44"
            />
          </form>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-2xs"
          >
            <option value="ALL">All Categories</option>
            <option value="NEW_FEATURE">New Features</option>
            <option value="IMPROVEMENT">Improvements</option>
            <option value="BUG_FIX">Bug Fixes & Patches</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="GENERAL_ANNOUNCEMENT">Announcements</option>
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

          {/* New Update Button (Admin) */}
          {isAdmin && (
            <button
              onClick={onNewUpdate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Release Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* Updates List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-200">
            Loading releases...
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
            <Rocket className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-900">No Releases Matching Filters</div>
            <div className="text-xs text-slate-500 mt-1">
              Adjust your search keywords or filter criteria.
            </div>
          </div>
        ) : (
          updates.map((upd) => {
            const isExpanded = expandedUpdateId === upd.id;
            const commentsList = selectedUpdateComments[upd.id] || [];

            return (
              <div
                key={upd.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all p-5 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getTypeBadge(
                          upd.update_type
                        )}`}
                      >
                        {upd.update_type.replace('_', ' ')}
                      </span>
                      {upd.version && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {upd.version}
                        </span>
                      )}
                      {upd.publication_state === 'DRAFT' && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                          DRAFT (Internal)
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Status: {upd.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{upd.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Send Notification Button (Admin Only) */}
                    {isAdmin && upd.publication_state === 'PUBLISHED' && (
                      <button
                        onClick={() => onSendNotificationForUpdate(upd)}
                        className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Send email notification to leadership"
                      >
                        <Mail className="w-3.5 h-3.5 text-orange-600" />
                        <span>Send Email Notice</span>
                      </button>
                    )}

                    {/* Expand Details & Comments Toggle */}
                    <button
                      onClick={() => toggleExpand(upd)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isExpanded ? 'Hide Details' : 'View Full Details & Discussion'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Admin Delete Action */}
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete release "${upd.title}"?`)) return;
                          try {
                            const res = await fetch(`/api/updates?id=${encodeURIComponent(upd.id)}`, { method: 'DELETE' });
                            if (res.ok) {
                              fetchUpdates();
                            } else {
                              alert('Failed to delete release.');
                            }
                          } catch {
                            alert('Network error while deleting release.');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Release"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-3">
                  {upd.description}
                </p>

                {/* Business Benefit Box */}
                {upd.business_benefit && (
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-950 mb-3">
                    <span className="font-bold text-blue-800">Business Benefit: </span>
                    {upd.business_benefit}
                  </div>
                )}

                {/* Meta Row: Systems, Publisher, Date */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-4">
                    {upd.systems_names && (() => {
                      const linkedSys = (systems as any[]).find((s) =>
                        upd.systems_names.toLowerCase().includes(s.name.toLowerCase())
                      );
                      return (
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          {linkedSys?.logo_url ? (
                            <div className="w-5 h-5 rounded-md bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                              <img src={linkedSys.logo_url} alt={linkedSys.name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <Server className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{upd.systems_names}</span>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Publisher: <strong>{upd.published_by_name || upd.owner}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    {upd.release_date ? (
                      <span>Released: {formatBaghdad(upd.release_date, 'date')}</span>
                    ) : upd.target_date ? (
                      <span>Target: {formatBaghdad(upd.target_date, 'date')}</span>
                    ) : null}
                    <span>Revision: v{upd.revision_count || 1}</span>
                  </div>
                </div>

                {/* Expandable Technical Details & Discussion */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-modal">
                    {/* Technical Changes */}
                    {upd.technical_changes && (
                      <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-blue-400 flex items-center gap-1.5">
                          <FileCode className="w-4 h-4" />
                          <span>Technical Architecture & Modifications:</span>
                        </div>
                        <p className="whitespace-pre-line text-slate-200 leading-relaxed font-mono">
                          {upd.technical_changes}
                        </p>
                      </div>
                    )}

                    {/* Deployment Env & Audit Trail */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <span>Deployment Environment: <strong>{upd.deployment_env || 'Production'}</strong></span>
                      <span>Published at: <strong>{upd.published_at ? formatBaghdad(upd.published_at, 'full') : 'Draft'}</strong></span>
                    </div>

                    {/* Dedicated Comments on Release */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Management Feedback & Questions ({commentsList.length})
                        </h4>
                      </div>

                      {/* Comment list */}
                      <div className="space-y-2 mb-3">
                        {commentsList.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">
                            No comments on this release yet. Managers can ask questions below.
                          </div>
                        ) : (
                          commentsList.map((c: any) => (
                            <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{c.author_name}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                    {c.author_role}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">{formatRelative(c.created_at)}</span>
                              </div>
                              <div className="text-slate-700 leading-relaxed">{c.content}</div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add comment input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[upd.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({ ...prev, [upd.id]: e.target.value }))
                          }
                          placeholder="Ask a technical question or add management feedback..."
                          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePostUpdateComment(upd.id);
                          }}
                        />
                        <button
                          onClick={() => handlePostUpdateComment(upd.id)}
                          disabled={submittingComment || !(commentInputs[upd.id] || '').trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Comment</span>
                        </button>
                      </div>
                    </div>
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
