'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { GashtyarLogo } from './GashtyarLogo';
import { formatBaghdad, nowUtc } from '@/lib/time';

interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface NotificationSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSubject?: string;
  defaultSummary?: string;
  contentType?: 'INCIDENT' | 'UPDATE' | 'DIGEST' | 'SYSTEM_STATUS' | 'GENERAL';
  referenceId?: string;
  systemName?: string;
  statusBadge?: string;
  etaText?: string;
  currentUser: { id: string; name: string; email: string };
}

export function NotificationSendModal({
  isOpen,
  onClose,
  onSuccess,
  defaultSubject = '',
  defaultSummary = '',
  contentType = 'UPDATE',
  referenceId,
  systemName,
  statusBadge,
  etaText,
  currentUser,
}: NotificationSendModalProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [summaryText, setSummaryText] = useState(defaultSummary);
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [idempotencyKey] = useState(() => `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (!isOpen) return;
    setSubject(defaultSubject);
    setSummaryText(defaultSummary);

    // Fetch authorized users for recipient selection
    async function fetchUsers() {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/users?recipients=true');
        if (res.ok) {
          const data = await res.json();
          const list: AuthorizedUser[] = data.users || [];
          setUsers(list);

          // By default, pre-select managers and executive management
          const initialSelection = new Set<string>();
          for (const u of list) {
            if (u.role === 'MANAGER' || u.role === 'ADMIN') {
              initialSelection.add(u.id);
            }
          }
          setSelectedUserIds(initialSelection);
        }
      } catch (err) {
        console.error('Failed to load recipient users:', err);
      } finally {
        setLoadingUsers(false);
      }
    }

    fetchUsers();
  }, [isOpen, defaultSubject, defaultSummary]);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedUserIds(new Set(users.map((u) => u.id)));
  };

  const selectManagersOnly = () => {
    setSelectedUserIds(new Set(users.filter((u) => u.role === 'MANAGER').map((u) => u.id)));
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      setError('Email subject line is required.');
      return;
    }
    if (!summaryText.trim()) {
      setError('Email summary text is required.');
      return;
    }
    if (selectedUserIds.size === 0) {
      setError('Please select at least one recipient.');
      return;
    }

    setSending(true);
    setError(null);

    const selectedRecipients = users
      .filter((u) => selectedUserIds.has(u.id))
      .map((u) => ({
        userId: u.id,
        email: u.email,
        name: u.name,
      }));

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          summaryText: summaryText.trim(),
          contentType,
          referenceId,
          systemName,
          statusBadge,
          etaText,
          recipients: selectedRecipients,
          idempotencyKey,
          targetUrlPath: `/?highlight=${referenceId || ''}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to queue notification.');
        setSending(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('Connection error while dispatching notification.');
      setSending(false);
    }
  };

  const baghdadTimeStr = formatBaghdad(nowUtc(), 'full');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-modal">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-orange-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Manual Update Notification Dispatch</h2>
              <div className="text-xs text-slate-300">
                Explicit push control &bull; Zero automated emails on edit
              </div>
            </div>
          </div>

          {/* Toggle between Edit and Email Preview */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewTab('EDIT')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  previewTab === 'EDIT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Compose & Recipients
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  previewTab === 'PREVIEW' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Email Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {previewTab === 'EDIT' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Email Subject & Summary */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Multi-Currency Direct Settlement Released"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Brief, Non-Sensitive Summary
                  </label>
                  <textarea
                    rows={6}
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    placeholder="Provide a clear, high-level summary for company leadership..."
                    className="w-full p-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                  <div className="text-[11px] text-slate-500 mt-1">
                    Security reminder: Never include credentials, internal IP addresses, or sensitive technical keys in email bodies.
                  </div>
                </div>

                {/* Metadata Tags */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-600">
                  {systemName && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">Affected System:</span>
                      <span>{systemName}</span>
                    </div>
                  )}
                  {statusBadge && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">Status Badge:</span>
                      <span className="font-bold text-blue-700">{statusBadge}</span>
                    </div>
                  )}
                  {etaText && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">Estimated Resolution:</span>
                      <span className="font-bold text-orange-600">{etaText}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Sent By:</span>
                    <span>{currentUser.name}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Recipient Selector */}
              <div className="md:col-span-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Recipients ({selectedUserIds.size})</span>
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      All
                    </button>
                    <span className="text-slate-300">&bull;</span>
                    <button
                      type="button"
                      onClick={selectManagersOnly}
                      className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Managers
                    </button>
                  </div>
                </div>

                {/* Recipient Checkbox List */}
                <div className="flex-1 max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-white">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading authorized users...</div>
                  ) : users.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No active users found.</div>
                  ) : (
                    users.map((u) => {
                      const isSelected = selectedUserIds.has(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => toggleUser(u.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/70 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-blue-600 border-slate-300 pointer-events-none"
                            />
                            <div>
                              <div className="text-xs font-semibold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-500">{u.email}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {u.role}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-2 text-[11px] text-slate-500">
                  Emails are dispatched individually without exposing other recipient addresses.
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW TAB: Exact HTML Email Preview */
            <div className="max-w-xl mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 p-5 border-b-2 border-orange-600 flex items-center justify-between text-white">
                  <div>
                    <div className="text-base font-bold">Gashtyar IT Operations</div>
                    <div className="text-[11px] text-slate-400">Management Portal & Systems Status</div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6">
                  {statusBadge && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-blue-100 text-blue-800 mb-3 border border-blue-200">
                      {statusBadge}
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    {subject || '[Update Title Preview]'}
                  </h3>

                  {(systemName || etaText) && (
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5 mb-4 text-slate-600">
                      {systemName && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-800">Affected System:</span>
                          <span>{systemName}</span>
                        </div>
                      )}
                      {etaText && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-800">Estimated Resolution:</span>
                          <span className="font-bold text-orange-600">{etaText}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-800">Updated By:</span>
                        <span>{currentUser.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-800">Baghdad Time:</span>
                        <span>{baghdadTimeStr}</span>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mb-6">
                    {summaryText || 'Your non-sensitive summary text will appear here...'}
                  </div>

                  <div className="text-center mb-6">
                    <span className="inline-block px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs">
                      View update securely &rarr;
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-100 leading-normal">
                    <strong>Security Notice:</strong> Gashtyar IT notification links do not grant automatic access. Following this link will require fresh 6-digit email code verification before confidential operations are revealed.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Explicit Send Notification Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600 font-medium">
            Selected Recipients: <strong>{selectedUserIds.size}</strong> authorized users
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || selectedUserIds.size === 0 || !subject.trim()}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Dispatching Queue...' : `Send Notification (${selectedUserIds.size})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
