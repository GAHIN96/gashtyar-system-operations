'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Rocket,
  Sparkles,
  Calendar,
  User,
  Server,
  Mail,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileCode,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { formatBaghdad } from '@/lib/time';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  systems: { id: string; name: string }[];
  currentUser: { id: string; name: string };
  onOpenNotificationModal?: (updateData: any) => void;
}

export function UpdateModal({
  isOpen,
  onClose,
  onSuccess,
  systems,
  currentUser,
  onOpenNotificationModal,
}: UpdateModalProps) {
  const [activeStep, setActiveStep] = useState<'edit' | 'preview'>('edit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [technicalChanges, setTechnicalChanges] = useState('');
  const [businessBenefit, setBusinessBenefit] = useState('');
  const [deploymentEnv, setDeploymentEnv] = useState('Production');
  const [owner, setOwner] = useState(currentUser.name || 'Gahin Mayi');
  const [updateType, setUpdateType] = useState('NEW_FEATURE');
  const [status, setStatus] = useState('RELEASED');
  const [version, setVersion] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveStep('edit');
    setTitle('');
    setDescription('');
    setTechnicalChanges('');
    setBusinessBenefit('');
    setDeploymentEnv('Production');
    setOwner(currentUser.name || 'Gahin Mayi');
    setUpdateType('NEW_FEATURE');
    setStatus('RELEASED');
    setVersion('');
    setTargetDate(new Date().toISOString().split('T')[0]);
    setSelectedSystemIds(systems.length > 0 ? [systems[0].id] : []);
  }, [isOpen, currentUser, systems]);

  if (!isOpen) return null;

  const toggleSystem = (id: string) => {
    if (selectedSystemIds.includes(id)) {
      setSelectedSystemIds(selectedSystemIds.filter((s) => s !== id));
    } else {
      setSelectedSystemIds([...selectedSystemIds, id]);
    }
  };

  const selectedSystemNames = systems
    .filter((s) => selectedSystemIds.includes(s.id))
    .map((s) => s.name)
    .join(', ');

  const submitAction = async (pubState: 'DRAFT' | 'PUBLISHED', sendEmail: boolean) => {
    if (!title.trim() || !description.trim() || !owner.trim()) {
      setError('Title, description, and owner are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      technical_changes: technicalChanges.trim(),
      business_benefit: businessBenefit.trim(),
      deployment_env: deploymentEnv,
      owner: owner.trim(),
      update_type: updateType,
      status,
      publication_state: pubState,
      target_date: targetDate ? new Date(targetDate).toISOString() : null,
      release_date: status === 'RELEASED' ? (targetDate ? new Date(targetDate).toISOString() : new Date().toISOString()) : null,
      version: version.trim() || null,
      system_ids: selectedSystemIds,
      sendNotification: false, // Default to no automated dispatch
    };

    try {
      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save update.');
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();

      // Step 3 / Email Publishing: If user explicitly selected "Publish and Send Email Notification"
      if (sendEmail && onOpenNotificationModal) {
        onOpenNotificationModal({
          subject: `[Update] ${title.trim()} ${version ? `(${version})` : ''}`,
          summaryText: `${description.trim()}\n\nTechnical Changes:\n${technicalChanges.trim() || 'Internal improvements'}\n\nBusiness Benefit:\n${businessBenefit.trim() || 'Improves operations'}`,
          contentType: 'UPDATE',
          referenceId: data.id,
          systemName: selectedSystemNames || 'Gashtyar Systems',
          statusBadge: status,
        });
      }
    } catch {
      setError('Connection error while saving update.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-modal">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-blue-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Release & Update Publishing Workflow</h2>
              <div className="text-xs text-slate-300">
                Step-by-step update creation, preview & publishing controls
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep(activeStep === 'edit' ? 'preview' : 'edit')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>{activeStep === 'edit' ? 'Preview for Management' : 'Back to Editor'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-4 text-xs font-bold text-slate-500">
          <span className={`flex items-center gap-1.5 ${activeStep === 'edit' ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">1</span>
            <span>Create Draft</span>
          </span>
          <span className="text-slate-300">&rarr;</span>
          <span className={`flex items-center gap-1.5 ${activeStep === 'preview' ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">2</span>
            <span>Executive Preview</span>
          </span>
          <span className="text-slate-300">&rarr;</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px]">3</span>
            <span>Publish Action</span>
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeStep === 'edit' ? (
            <>
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Update Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Multi-Currency Direct Settlement for Gate2Hotels"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Type, Status, Version Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Update Category
                  </label>
                  <select
                    value={updateType}
                    onChange={(e) => setUpdateType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="NEW_FEATURE">New Feature</option>
                    <option value="IMPROVEMENT">Improvement</option>
                    <option value="BUG_FIX">Bug Fix / Patch</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="GENERAL_ANNOUNCEMENT">Announcement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Deployment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="RELEASED">Released to Production</option>
                    <option value="TESTING">Testing / Staging</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PLANNED">Planned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Version Number
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v3.8.0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Affected Systems Multi-select */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Associated Systems
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
                            ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
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

              {/* Lead, Environment & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Publishing Lead
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Deployment Environment
                  </label>
                  <select
                    value={deploymentEnv}
                    onChange={(e) => setDeploymentEnv(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                  >
                    <option value="Production">Production Cluster</option>
                    <option value="Staging">Staging & Pre-prod</option>
                    <option value="Disaster Recovery">Disaster Recovery (DR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Update Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Overview of the update and capabilities..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Technical Changes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Technical Changes & Infrastructure Modifications
                </label>
                <textarea
                  rows={2}
                  value={technicalChanges}
                  onChange={(e) => setTechnicalChanges(e.target.value)}
                  placeholder="Detailed architectural changes, database migrations, API changes..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Business Benefit */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Business Impact & Management Benefits
                </label>
                <textarea
                  rows={2}
                  value={businessBenefit}
                  onChange={(e) => setBusinessBenefit(e.target.value)}
                  placeholder="Direct business benefit for Gashtyar leadership and operations..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </>
          ) : (
            /* STEP 2 — PREVIEW (Executive view exactly as management will see it) */
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span className="font-bold">Executive Preview Mode:</span>
                <span className="text-[11px] text-blue-700">This is how Gashtyar Company Managers will see this publication.</span>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900">{title || 'Untitled Release'}</span>
                      {version && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200">
                          {version}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold">
                        {updateType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Systems: <strong>{selectedSystemNames || 'All Systems'}</strong> &bull; Environment: {deploymentEnv}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                    {status}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Executive Summary</h4>
                  <p className="text-xs text-slate-800 leading-relaxed mt-1">
                    {description || 'No description provided.'}
                  </p>
                </div>

                {technicalChanges && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <h5 className="font-bold text-slate-900 mb-1">Technical Changes & Architecture</h5>
                    <p className="whitespace-pre-line leading-relaxed">{technicalChanges}</p>
                  </div>
                )}

                {businessBenefit && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
                    <h5 className="font-bold mb-1">Direct Business Benefit</h5>
                    <p className="whitespace-pre-line leading-relaxed">{businessBenefit}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Publishing Administrator: <strong>{owner}</strong></span>
                  <span>Effective Date: {targetDate || 'Today'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Step 3 Publishing Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Step 3 Option 1: Save as Draft */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitAction('DRAFT', false)}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save as Draft</span>
            </button>

            {/* Step 3 Option 2: Publish Internally */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitAction('PUBLISHED', false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publish Internally</span>
            </button>

            {/* Step 3 Option 3: Publish & Send Email Notification */}
            <button
              type="button"
              disabled={submitting}
              onClick={() => submitAction('PUBLISHED', true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Publish & Send Email Notification</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
