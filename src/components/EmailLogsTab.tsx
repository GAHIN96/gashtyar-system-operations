'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Settings,
  Shield,
  Send,
  Eye,
  FileText,
} from 'lucide-react';
import { formatBaghdad, formatRelative } from '@/lib/time';

interface EmailLogsTabProps {
  onOpenNewNotification: () => void;
  onOpenSmtpSettings: () => void;
  isAdmin: boolean;
}

export function EmailLogsTab({
  onOpenNewNotification,
  onOpenSmtpSettings,
  isAdmin,
}: EmailLogsTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch notification logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRetry = async (notificationId: string) => {
    setRetryingId(notificationId);
    setRetryMessage(null);
    try {
      const res = await fetch(`/api/notifications/${notificationId}/retry`, {
        method: 'POST',
      });
      const resData = await res.json();
      if (res.ok) {
        setRetryMessage(`Retried ${resData.retriedCount} failed recipient(s).`);
        fetchLogs();
      } else {
        setRetryMessage(resData.error || 'Retry failed.');
      }
    } catch {
      setRetryMessage('Network error during retry.');
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'COMPLETED':
      case 'PROVIDER_ACCEPTED':
      case 'DELIVERED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'PARTIALLY_FAILED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'FAILED':
      case 'BOUNCED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'PROCESSING':
      case 'QUEUED':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-400 border border-slate-200">
        Loading email dispatch and delivery logs...
      </div>
    );
  }

  const notifications = data?.notifications || [];
  const deliveries = data?.recentDeliveries || [];
  const smtpConfigured = data?.smtpConfigured;
  const smtpDetails = data?.smtpDetails;

  return (
    <div className="space-y-6">
      {/* SMTP Provider Status Alert (Section 7 Requirement) */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          smtpConfigured
            ? 'bg-green-50/70 border-green-200 text-green-900'
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              smtpConfigured ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
            }`}
          >
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold">
              {smtpConfigured
                ? `Production SMTP Connected (${smtpDetails?.host}:${smtpDetails?.port})`
                : 'SMTP Provider Not Configured (Local Outbox Simulator Active)'}
            </div>
            <div className="text-xs mt-0.5 opacity-90 leading-relaxed">
              {smtpConfigured
                ? `Live transactional and manual notification emails are dispatched from ${smtpDetails?.from}.`
                : 'Production delivery is disabled. Update notifications and verification codes are captured locally in the development outbox so you can safely audit all queues without accidental external sends.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={onOpenSmtpSettings}
            className="px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure SMTP</span>
          </button>

          <button
            onClick={onOpenNewNotification}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose Notification</span>
          </button>
        </div>
      </div>

      {retryMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          {retryMessage}
        </div>
      )}

      {/* Notifications Batch Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Dispatched Notification Batches</h3>
            <p className="text-xs text-slate-500">
              Idempotent push batches, sender audit, and recipient breakdown.
            </p>
          </div>
          <button
            onClick={fetchLogs}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No manual update notifications have been dispatched yet.
            </div>
          ) : (
            notifications.map((n: any) => (
              <div key={n.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {n.content_type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          n.status
                        )}`}
                      >
                        {n.status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Dispatched by <strong>{n.sender_name}</strong>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{n.subject}</h4>
                  </div>

                  {/* Retry Button if there are failed recipients */}
                  {n.failed_count > 0 && isAdmin && (
                    <button
                      onClick={() => handleRetry(n.id)}
                      disabled={retryingId === n.id}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{retryingId === n.id ? 'Retrying...' : `Retry ${n.failed_count} Failed`}</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                  {n.summary_text}
                </p>

                {/* Recipient delivery counts */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-4">
                    <span>
                      Total Recipients: <strong>{n.total_recipients}</strong>
                    </span>
                    <span className="text-green-700">
                      Accepted/Delivered: <strong>{n.accepted_count || 0}</strong>
                    </span>
                    {n.failed_count > 0 && (
                      <span className="text-red-600 font-bold">
                        Failed: {n.failed_count}
                      </span>
                    )}
                    {n.queued_count > 0 && (
                      <span className="text-blue-600 font-medium">
                        Queued: {n.queued_count}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {formatBaghdad(n.created_at, 'full')} ({formatRelative(n.created_at)})
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recipient-Level Delivery Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">Recipient-Level Delivery Audit</h3>
          <p className="text-xs text-slate-500">
            Per-recipient delivery state: QUEUED, PROVIDER_ACCEPTED, DELIVERED, FAILED.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Recipient</th>
                <th className="px-5 py-3">Notification Subject</th>
                <th className="px-5 py-3">Delivery Status</th>
                <th className="px-5 py-3">Attempted At</th>
                <th className="px-5 py-3">Provider Response / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No recipient delivery records yet.
                  </td>
                </tr>
              ) : (
                deliveries.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      <div>{d.name}</div>
                      <div className="text-[11px] text-slate-400">{d.email}</div>
                    </td>
                    <td className="px-5 py-3 max-w-[200px] truncate text-slate-800">
                      {d.notification_subject}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          d.status
                        )}`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {formatBaghdad(d.attempted_at, 'short')}
                    </td>
                    <td className="px-5 py-3 max-w-[240px] truncate text-slate-500 font-mono text-[11px]">
                      {d.error_message ? (
                        <span className="text-red-600">{d.error_message}</span>
                      ) : (
                        <span>{d.provider_response || 'Acknowledged by delivery engine'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
