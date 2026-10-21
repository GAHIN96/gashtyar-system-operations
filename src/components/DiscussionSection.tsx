'use client';

import React, { useState, useEffect } from 'react';
import {
  MessagesSquare,
  Send,
  User,
  Shield,
  Edit2,
  Trash2,
  AlertCircle,
  Clock,
  Check,
  HelpCircle,
  CornerDownRight,
  Filter,
  Server,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { formatBaghdad, formatRelative } from '@/lib/time';

interface DiscussionSectionProps {
  currentUser: { id: string; name: string; role: string; email: string };
  isAdmin: boolean;
  systems?: { id: string; name: string }[];
}

export function DiscussionSection({ currentUser, isAdmin, systems = [] }: DiscussionSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isRequestUpdate, setIsRequestUpdate] = useState(false);
  const [selectedTargetType, setSelectedTargetType] = useState('GENERAL');
  const [selectedTargetId, setSelectedTargetId] = useState('general_board');
  const [filterMode, setFilterMode] = useState<'ALL' | 'REQUESTS_ONLY' | 'PENDING_IT' | 'ANSWERED'>('ALL');
  const [submitting, setSubmitting] = useState(false);

  // IT Manager Response state
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [itReplyText, setItReplyText] = useState('');
  const [itReplyStatus, setItReplyStatus] = useState('ANSWERED');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchComments = async () => {
    try {
      const res = await fetch('/api/comments');
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to load discussion comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: selectedTargetType,
          target_id: selectedTargetId,
          content: content.trim(),
          is_request_update: isRequestUpdate,
        }),
      });

      if (res.ok) {
        setContent('');
        setIsRequestUpdate(false);
        fetchComments();
      }
    } catch (err) {
      console.error('Error posting discussion comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendItResponse = async (commentId: string) => {
    if (!itReplyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch('/api/comments/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: commentId,
          it_response: itReplyText.trim(),
          request_status: itReplyStatus,
        }),
      });

      if (res.ok) {
        setReplyingCommentId(null);
        setItReplyText('');
        fetchComments();
      }
    } catch (err) {
      console.error('Error sending IT response:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this comment?')) return;
    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchComments();
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    if (filterMode === 'REQUESTS_ONLY') return c.is_request_update === 1;
    if (filterMode === 'PENDING_IT') return c.is_request_update === 1 && !c.it_response;
    if (filterMode === 'ANSWERED') return c.is_request_update === 1 && c.it_response;
    return true;
  });

  const pendingRequestsCount = comments.filter((c) => c.is_request_update === 1 && !c.it_response).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Management Discussions & IT Requests</h2>
            {pendingRequestsCount > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                {pendingRequestsCount} Pending IT Response
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Dedicated leadership discussion portal. Company managers can ask technical questions or flag &ldquo;Request Update from IT&rdquo;.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Messages ({comments.length})
          </button>
          <button
            onClick={() => setFilterMode('REQUESTS_ONLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'REQUESTS_ONLY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Update Requests
          </button>
          <button
            onClick={() => setFilterMode('PENDING_IT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'PENDING_IT'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pending IT Reply ({pendingRequestsCount})
          </button>
        </div>
      </div>

      {/* Main Grid: Discussion List (Col 8) + Post Form (Col 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Messages Feed */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading management discussions...
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              No discussion items matching active filter. Post a note or request on the right.
            </div>
          ) : (
            filteredComments.map((c) => {
              const isAuthor = c.author_id === currentUser.id;
              const hasItReply = Boolean(c.it_response);

              return (
                <div
                  key={c.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    c.is_request_update === 1
                      ? 'bg-white border-amber-200 shadow-xs'
                      : 'bg-white border-slate-200/80 shadow-xs'
                  }`}
                >
                  {/* Author Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                        {c.author_name ? c.author_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{c.author_name}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.2 rounded border ${
                              c.author_role === 'ADMIN'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {c.author_role}
                          </span>

                          {c.is_request_update === 1 && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1 shadow-2xs">
                              <HelpCircle className="w-3 h-3" />
                              Update Requested ({c.request_status || 'OPEN'})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          {(() => {
                            if (c.target_type === 'SYSTEM') {
                              const targetSys = (systems as any[]).find((s) => s.id === c.target_id || s.slug === c.target_id);
                              return (
                                <div className="flex items-center gap-1.5">
                                  {targetSys?.logo_url ? (
                                    <div className="w-4 h-4 rounded bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                      <img src={targetSys.logo_url} alt={targetSys.name} className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <Server className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  <span>System: <strong className="text-slate-700">{targetSys?.name || c.target_id}</strong></span>
                                </div>
                              );
                            }
                            return <span>Target: <strong className="text-slate-700">{c.target_type} {c.target_id}</strong></span>;
                          })()}
                          <span>&bull;</span>
                          <span>{formatRelative(c.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Delete button for author or admin */}
                    {(isAuthor || isAdmin) && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Comment Content */}
                  <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-line pl-11">
                    {c.content}
                  </div>

                  {/* IT Manager Official Response */}
                  {hasItReply && (
                    <div className="mt-3.5 ml-11 p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-950">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          <CornerDownRight className="w-4 h-4 text-blue-600" />
                          IT Response from {c.it_responder_name || 'Gahin Mayi'}
                        </span>
                        <span className="text-[10px] text-blue-700 font-semibold">
                          {c.it_responded_at ? formatRelative(c.it_responded_at) : 'Official IT Resolution'}
                        </span>
                      </div>
                      <div className="font-medium whitespace-pre-line leading-relaxed">
                        {c.it_response}
                      </div>
                    </div>
                  )}

                  {/* Admin Reply Action */}
                  {isAdmin && c.is_request_update === 1 && !hasItReply && replyingCommentId !== c.id && (
                    <div className="mt-3 ml-11 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setReplyingCommentId(c.id);
                          setItReplyText('');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Reply to Management Request &rarr;</span>
                      </button>
                    </div>
                  )}

                  {/* Admin Reply Input Form */}
                  {replyingCommentId === c.id && (
                    <div className="mt-3 ml-11 p-3 bg-slate-50 rounded-xl border border-blue-200 space-y-2">
                      <div className="text-xs font-bold text-slate-800">
                        Submit Official IT Manager Reply:
                      </div>
                      <textarea
                        value={itReplyText}
                        onChange={(e) => setItReplyText(e.target.value)}
                        placeholder="Provide technical update, root cause details, or resolution progress..."
                        rows={2}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 font-medium">Request Status:</span>
                          <select
                            value={itReplyStatus}
                            onChange={(e) => setItReplyStatus(e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                          >
                            <option value="ANSWERED">Answered</option>
                            <option value="ACKNOWLEDGED">Acknowledged (Investigating)</option>
                            <option value="RESOLVED">Resolved</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReplyingCommentId(null)}
                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSendItResponse(c.id)}
                            disabled={submittingReply || !itReplyText.trim()}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {submittingReply ? 'Sending...' : 'Send Response'}
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

        {/* Post Form (Right Column) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs sticky top-36">
          <div className="flex items-center gap-2 mb-3">
            <MessagesSquare className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Post Management Feedback</h3>
          </div>

          <form onSubmit={handlePost} className="space-y-3">
            {/* Target System */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Context / Affected System
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => {
                  setSelectedTargetId(e.target.value);
                  setSelectedTargetType(e.target.value === 'general_board' ? 'GENERAL' : 'SYSTEM');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="general_board">General Discussion Board</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    System: {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Request Update from IT Toggle */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequestUpdate}
                  onChange={(e) => setIsRequestUpdate(e.target.checked)}
                  className="rounded text-amber-600 mt-0.5"
                />
                <div>
                  <div className="text-xs font-bold text-amber-900">Request Update from IT</div>
                  <div className="text-[11px] text-amber-800 leading-tight mt-0.5">
                    Creates an outstanding management inquiry flag requiring an official response from the IT Manager.
                  </div>
                </div>
              </label>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Comment Text
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your observation, question, or inquiry..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
              <span>Author: <strong>{currentUser.name}</strong></span>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Posting...' : 'Post Message'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
