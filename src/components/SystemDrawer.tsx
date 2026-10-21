'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  AlertTriangle,
  User,
  Clock,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Edit,
  Send,
  Globe,
  Cpu,
  Layers,
  History,
  Info,
  CheckCircle2,
  FileCode,
  Lock,
  CornerDownRight,
  HelpCircle,
  Activity,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { SystemItemData } from './SystemCard';
import { formatBaghdad, formatRelative } from '@/lib/time';

interface SystemDrawerProps {
  system: SystemItemData | null;
  onClose: () => void;
  onEditSystem?: (system: SystemItemData) => void;
  currentUser: { id: string; name: string; role: string; email: string };
  isAdmin: boolean;
}

type SystemDetailTab = 'overview' | 'technical' | 'updates' | 'incidents' | 'discussion' | 'activity';

export function SystemDrawer({
  system,
  onClose,
  onEditSystem,
  currentUser,
  isAdmin,
}: SystemDrawerProps) {
  const [activeTab, setActiveTab] = useState<SystemDetailTab>('overview');
  const [details, setDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isRequestUpdate, setIsRequestUpdate] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // IT Response state for admin
  const [respondingToCommentId, setRespondingToCommentId] = useState<string | null>(null);
  const [itResponseText, setItResponseText] = useState('');
  const [itResponseStatus, setItResponseStatus] = useState('ANSWERED');
  const [submittingItResponse, setSubmittingItResponse] = useState(false);

  // Load deep details from API
  const fetchSystemDetails = async () => {
    if (!system) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/systems/${system.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to load system details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (system) {
      fetchSystemDetails();
    }
  }, [system]);

  if (!system) return null;

  const currentSystem = details?.system || system;
  const incidents = details?.incidents || [];
  const updates = details?.updates || [];
  const auditLogs = details?.auditLogs || [];

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: 'SYSTEM',
          target_id: system.id,
          content: commentText.trim(),
          is_request_update: isRequestUpdate,
        }),
      });

      if (res.ok) {
        setCommentText('');
        setIsRequestUpdate(false);
        fetchSystemDetails();
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSendItResponse = async (commentId: string) => {
    if (!itResponseText.trim()) return;
    setSubmittingItResponse(true);
    try {
      const res = await fetch('/api/comments/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: commentId,
          it_response: itResponseText.trim(),
          request_status: itResponseStatus,
        }),
      });

      if (res.ok) {
        setRespondingToCommentId(null);
        setItResponseText('');
        fetchSystemDetails();
      }
    } catch (err) {
      console.error('Error sending IT response:', err);
    } finally {
      setSubmittingItResponse(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'DEGRADED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'UNAVAILABLE':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const tabList: { id: SystemDetailTab; label: string; count?: number; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'technical', label: 'Technical Information', icon: Cpu },
    { id: 'updates', label: 'Releases & Updates', count: updates.length, icon: Sparkles },
    { id: 'incidents', label: 'Incidents', count: incidents.length, icon: AlertTriangle },
    { id: 'discussion', label: 'Management Discussion', count: comments.length, icon: MessageSquare },
    { id: 'activity', label: 'Activity History', count: auditLogs.length, icon: History },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-drawer">
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b-2 border-blue-600 shrink-0">
          <div className="flex items-center gap-4">
            {/* Consistent 64 × 64 px logo container with white/light neutral background & subtle rounded borders */}
            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 overflow-hidden p-1.5">
              {currentSystem.logo_url ? (
                <img
                  src={currentSystem.logo_url}
                  alt={`${currentSystem.name} logo`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Server className="w-8 h-8 text-slate-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">{currentSystem.name}</h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusColor(
                    currentSystem.status
                  )}`}
                >
                  {currentSystem.status}
                </span>
                {!isAdmin && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                    Management View (Read-Only)
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{currentSystem.category}</span>
                <span>&bull;</span>
                <span>Lead: {currentSystem.responsible_team || currentSystem.owner}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onEditSystem && (
              <button
                onClick={() => onEditSystem(currentSystem)}
                className="px-3 py-1.5 bg-[#0077C8] hover:bg-[#0060A8] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Edit system configuration"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit System</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Sub-tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 shrink-0 overflow-x-auto scrollbar-none flex gap-2">
          {tabList.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Fetching verified system records...</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  Description & Strategic Purpose
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {currentSystem.description}
                </p>
                {currentSystem.purpose && (
                  <div className="mt-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed">
                    <strong>Operational Purpose:</strong> {currentSystem.purpose}
                  </div>
                )}
              </div>

              {/* Status & Business Impact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Operational Status</div>
                  <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(currentSystem.status).includes('green') ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span>{currentSystem.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Health Check: {currentSystem.health_check_type || 'Manual IT Verification'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Responsible Team</div>
                  <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{currentSystem.responsible_team || currentSystem.owner}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    System Owner: {currentSystem.owner}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs sm:col-span-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Business Importance & Impact</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1 leading-relaxed">
                    {currentSystem.business_impact || 'Critical operational service for daily business execution.'}
                  </div>
                </div>
              </div>

              {/* Active Incident / Stage Banner if degraded */}
              {(currentSystem.investigation_stage || currentSystem.eta_text) && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1.5 text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Operational Investigation & ETA</span>
                  </div>
                  <div className="text-xs text-slate-800 leading-relaxed font-medium">
                    {currentSystem.investigation_stage}
                  </div>
                  {currentSystem.eta_text && (
                    <div className="mt-2 text-xs font-bold text-orange-700 bg-white/90 p-2.5 rounded-xl border border-amber-200 inline-block shadow-2xs">
                      Target Resolution: {currentSystem.eta_text}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TECHNICAL INFORMATION */}
          {activeTab === 'technical' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hosting Environment */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    <Server className="w-4 h-4 text-blue-600" />
                    Hosting Environment
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {currentSystem.hosting_env || 'Not specified'}
                  </div>
                </div>

                {/* Domains */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    <Globe className="w-4 h-4 text-blue-600" />
                    Domain Names & Endpoints
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-700 mt-1 break-all">
                    {currentSystem.domain_names || 'None registered'}
                  </div>
                </div>

                {/* Technology Stack */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    Technology Stack & Architecture
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-1.5 flex flex-wrap gap-2">
                    {currentSystem.tech_stack && currentSystem.tech_stack.trim() ? (
                      currentSystem.tech_stack
                        .split(',')
                        .map((tech: string, i: number) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200"
                          >
                            {tech.trim()}
                          </span>
                        ))
                    ) : (
                      <span className="text-slate-400 italic text-xs">Not specified</span>
                    )}
                  </div>
                </div>

                {/* Connected Integrations */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Connected Services & Integrations
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-1.5 flex flex-wrap gap-2">
                    {currentSystem.connected_integrations && currentSystem.connected_integrations.trim() ? (
                      currentSystem.connected_integrations
                        .split(',')
                        .map((item: string, i: number) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200"
                          >
                            {item.trim()}
                          </span>
                        ))
                    ) : (
                      <span className="text-slate-400 italic text-xs">None registered</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Technical Configuration Details (Masked for Managers) */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Configuration Details & Parameters
                    </h4>
                  </div>
                  {!isAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Sensitive secrets masked
                    </span>
                  )}
                </div>

                <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                  {currentSystem.config_details || '// No configuration parameters specified for this system.'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: RELEASES & UPDATES */}
          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium">
                Published updates, release notes, and deployment history for {currentSystem.name}.
              </div>

              {updates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  No published releases found for this system.
                </div>
              ) : (
                updates.map((u: any) => (
                  <div key={u.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{u.title}</span>
                        {u.version && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono font-bold border border-blue-200">
                            {u.version}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {u.update_type}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {u.release_date ? formatBaghdad(u.release_date, 'date') : formatRelative(u.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed mt-1">
                      {u.description}
                    </p>

                    {u.technical_changes && (
                      <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                        <strong className="text-slate-700">Technical Changes:</strong> {u.technical_changes}
                      </div>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Publisher: <strong>{u.published_by_name || u.owner}</strong></span>
                      <span>Deployment: {u.deployment_env || 'Production'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: INCIDENTS */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium">
                Technical incidents, resolutions, and estimated restoration times for {currentSystem.name}.
              </div>

              {incidents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  No active or past incidents recorded for this system. All services healthy.
                </div>
              ) : (
                incidents.map((inc: any) => (
                  <div key={inc.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-700 text-xs">{inc.incident_ref}</span>
                        <span className="font-bold text-slate-900 text-sm">{inc.title}</span>
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                          {inc.priority} &bull; {inc.severity}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          inc.status === 'RESOLVED'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed mt-1">
                      {inc.description}
                    </p>

                    {inc.eta_date && (
                      <div className="mt-2 text-xs font-semibold text-orange-700">
                        Estimated Resolution: {formatBaghdad(inc.eta_date, 'full')}
                      </div>
                    )}

                    {inc.resolution_summary && (
                      <div className="mt-2.5 p-2.5 bg-green-50 rounded-xl border border-green-200 text-xs text-green-900">
                        <strong>Resolution:</strong> {inc.resolution_summary}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: MANAGEMENT DISCUSSION */}
          {activeTab === 'discussion' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    System Management Discussion ({comments.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Collaborative communication thread for company leadership and IT Operations.
                  </p>
                </div>
              </div>

              {/* Comments Thread List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No management comments on this system yet. Post questions or update requests below.
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl border text-xs ${
                        c.is_request_update === 1
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-slate-200'
                      } shadow-xs`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{c.author_name}</span>
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
                            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                              <HelpCircle className="w-3 h-3" />
                              Update Requested ({c.request_status || 'OPEN'})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatRelative(c.created_at)}
                        </span>
                      </div>

                      <div className="text-slate-800 whitespace-pre-line leading-relaxed text-xs">
                        {c.content}
                      </div>

                      {/* IT Official Response Display */}
                      {c.it_response && (
                        <div className="mt-3 p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                              <CornerDownRight className="w-3.5 h-3.5 text-blue-600" />
                              IT Manager Response ({c.it_responder_name || 'Gahin Mayi'})
                            </span>
                            <span className="text-[10px] text-blue-600 font-semibold">
                              {c.it_responded_at ? formatRelative(c.it_responded_at) : 'Official IT Note'}
                            </span>
                          </div>
                          <div className="text-blue-950 font-medium whitespace-pre-line leading-relaxed">
                            {c.it_response}
                          </div>
                        </div>
                      )}

                      {/* Admin IT Response Action */}
                      {isAdmin && c.is_request_update === 1 && !c.it_response && respondingToCommentId !== c.id && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setRespondingToCommentId(c.id);
                              setItResponseText('');
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Reply to Management Request &rarr;</span>
                          </button>
                        </div>
                      )}

                      {/* Admin IT Response Form */}
                      {respondingToCommentId === c.id && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-blue-200 space-y-2">
                          <div className="text-[11px] font-bold text-slate-700">
                            Submit Official IT Manager Reply:
                          </div>
                          <textarea
                            value={itResponseText}
                            onChange={(e) => setItResponseText(e.target.value)}
                            placeholder="Write IT explanation or operational status response..."
                            rows={2}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-500 font-medium">Status:</span>
                              <select
                                value={itResponseStatus}
                                onChange={(e) => setItResponseStatus(e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                              >
                                <option value="ANSWERED">Answered</option>
                                <option value="ACKNOWLEDGED">Acknowledged (Investigating)</option>
                                <option value="RESOLVED">Resolved</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setRespondingToCommentId(null)}
                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSendItResponse(c.id)}
                                disabled={submittingItResponse || !itResponseText.trim()}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                {submittingItResponse ? 'Sending...' : 'Send Response'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              <form onSubmit={handlePostComment} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Add Discussion Comment</span>
                  <label className="flex items-center gap-2 text-xs text-amber-800 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRequestUpdate}
                      onChange={(e) => setIsRequestUpdate(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Request Update from IT</span>
                  </label>
                </div>

                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post management feedback, ask technical questions, or request an IT update..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Posting as <strong>{currentUser.name}</strong> ({currentUser.role})
                  </span>

                  <button
                    type="submit"
                    disabled={submittingComment || !commentText.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: ACTIVITY HISTORY */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium">
                Audit history of all authorized system modifications, publications, and status changes.
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  No audit log entries recorded for this system yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-3.5 text-xs flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.action}</span>
                          <span className="text-slate-500 font-medium">{log.details}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Actor: <strong>{log.user_email || 'System'}</strong> &bull; IP: {log.ip_address || 'internal'}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {formatBaghdad(log.created_at, 'full')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Verified: {formatBaghdad(currentSystem.updated_at, 'full')}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 cursor-pointer shadow-2xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
