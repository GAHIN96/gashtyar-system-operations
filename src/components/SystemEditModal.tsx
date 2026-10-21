'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Server,
  Save,
  Archive,
  AlertTriangle,
  UploadCloud,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface SystemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  system: any | null; // null for new, object for edit
}

export function SystemEditModal({
  isOpen,
  onClose,
  onSuccess,
  system,
}: SystemEditModalProps) {
  const isEdit = Boolean(system);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [businessImpact, setBusinessImpact] = useState('');
  const [status, setStatus] = useState('OPERATIONAL');
  const [sortOrder, setSortOrder] = useState('1');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (system) {
      setName(system.name || '');
      setCategory(system.category || '');
      setOwner(system.owner || '');
      setDescription(system.description || '');
      setBusinessImpact(system.business_impact || '');
      setStatus(system.status || 'OPERATIONAL');
      setSortOrder(String(system.sort_order || 1));
      setLogoUrl(system.logo_url || '');
    } else {
      setName('');
      setCategory('Booking Engine');
      setOwner('Gahin Mayi');
      setDescription('');
      setBusinessImpact('');
      setStatus('OPERATIONAL');
      setSortOrder('10');
      setLogoUrl('');
    }
    setError(null);
    setLogoUploadError(null);
  }, [isOpen, system]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    // 1. Client-side size check (Max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setLogoUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 2 MB.`);
      return;
    }

    // 2. MIME type check
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setLogoUploadError('Unsupported file type. Please upload a PNG, JPG, JPEG, SVG, or WebP image.');
      return;
    }

    setUploadingLogo(true);
    setLogoUploadError(null);

    const formData = new FormData();
    formData.append('logo', file);
    formData.append('systemSlug', name.trim() || 'system');

    try {
      const tabToken = typeof window !== 'undefined' ? window.sessionStorage.getItem('gashtyar_tab_token') || '' : '';
      const headers: Record<string, string> = {};
      if (tabToken) {
        headers['x-tab-token'] = tabToken;
      }

      const res = await fetch('/api/systems/upload-logo', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setLogoUploadError(data.error || 'Failed to upload logo.');
        return;
      }

      setLogoUrl(data.logo_url);
    } catch {
      setLogoUploadError('Network error uploading logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !owner.trim()) {
      setError('Name, category, and owner are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: any = {
      name: name.trim(),
      category: category.trim(),
      owner: owner.trim(),
      description: description.trim(),
      business_impact: businessImpact.trim(),
      status,
      sort_order: Number(sortOrder) || 1,
      logo_url: logoUrl,
    };

    if (isEdit) {
      payload.id = system.id;
    }

    try {
      const tabToken = typeof window !== 'undefined' ? window.sessionStorage.getItem('gashtyar_tab_token') || '' : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tabToken) {
        headers['x-tab-token'] = tabToken;
      }

      const res = await fetch('/api/systems', {
        method: isEdit ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save system.');
        setSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError('Connection error while saving system.');
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${system.name}"? It will be removed from the main operational dashboard.`)) return;

    setSubmitting(true);
    try {
      const tabToken = typeof window !== 'undefined' ? window.sessionStorage.getItem('gashtyar_tab_token') || '' : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tabToken) {
        headers['x-tab-token'] = tabToken;
      }

      const res = await fetch('/api/systems', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: system.id,
          is_archived: true,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch {
      setError('Failed to archive system.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-modal">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b-2 border-blue-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">{isEdit ? `Configure ${system.name}` : 'Add Tracked System'}</h3>
              <div className="text-xs text-slate-300">System branding, metadata & operational hierarchy</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(88vh-80px)] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          {/* SYSTEM LOGO UPLOAD SECTION */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  System Logo
                </label>
                <p className="text-[11px] text-slate-500">
                  PNG, JPG, SVG, WebP with transparent background support (Max 2 MB).
                </p>
              </div>
              {logoUrl && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Custom Logo Active
                </span>
              )}
            </div>

            {logoUploadError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{logoUploadError}</span>
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Immediate Logo Preview Container (64x64px, rounded-xl 10-12px, contain, light neutral/white bg) */}
              <div className="w-16 h-16 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                {uploadingLogo ? (
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="System Logo Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Server className="w-6 h-6 text-slate-400" />
                    <span className="text-[8px] font-semibold text-slate-400 mt-0.5">DEFAULT</span>
                  </div>
                )}
              </div>

              {/* Upload & Drag-and-Drop Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex-1 p-3 rounded-xl border-2 border-dashed transition-all flex items-center justify-between gap-3 ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      {uploadingLogo ? 'Optimizing & uploading...' : 'Drag & drop or choose logo'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Original branding preserved without stretching
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    id="system-logo-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <button
                    id="select-logo-file-btn"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {logoUrl ? 'Replace Logo' : 'Select File'}
                  </button>

                  {logoUrl && (
                    <button
                      id="remove-logo-btn"
                      type="button"
                      onClick={handleRemoveLogo}
                      title="Remove custom logo and restore clean default icon"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Logo Presets */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Quick Presets:
              </span>
              <button
                id="preset-logo-gashtyar"
                type="button"
                onClick={() => setLogoUrl('/images/gashtyar_logo.png')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  logoUrl === '/images/gashtyar_logo.png'
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <img src="/images/gashtyar_logo.png" alt="Gashtyar" className="w-3.5 h-3.5 object-contain" />
                <span>Gashtyar Official</span>
              </button>
              <button
                id="preset-logo-gate2hotels"
                type="button"
                onClick={() => setLogoUrl('/uploads/logos/logo_gate2hotels-b2b_d0bb12c2f70d.png')}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  logoUrl === '/uploads/logos/logo_gate2hotels-b2b_d0bb12c2f70d.png'
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <img src="/uploads/logos/logo_gate2hotels-b2b_d0bb12c2f70d.png" alt="Gate2Hotels" className="w-3.5 h-3.5 object-contain" />
                <span>Gate2Hotels B2B</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              System Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ticketaat Flights"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Booking Engine"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Display Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OPERATIONAL">Operational</option>
                <option value="DEGRADED">Degraded</option>
                <option value="UNAVAILABLE">Unavailable</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary function of this system..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Business Impact
            </label>
            <input
              type="text"
              value={businessImpact}
              onChange={(e) => setBusinessImpact(e.target.value)}
              placeholder="e.g. High - Direct B2B reservation transactions"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {isEdit ? (
              <button
                type="button"
                onClick={handleArchive}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive System</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                id="cancel-system-btn"
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-system-btn"
                type="submit"
                disabled={submitting || uploadingLogo}
                className="px-4 py-2 bg-[#0077C8] hover:bg-[#0060A8] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create System'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
