'use client';

import React from 'react';
import {
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Plane,
  Building2,
  Database,
  Users,
  Globe,
  Server,
  Edit2,
} from 'lucide-react';

export interface SystemItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  owner: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'UNAVAILABLE' | 'MAINTENANCE';
  sort_order: number;
  is_archived: number;
  business_impact?: string;
  investigation_stage?: string;
  eta_text?: string;
  eta_reason?: string;
  hosting_env?: string;
  domain_names?: string;
  tech_stack?: string;
  connected_integrations?: string;
  responsible_team?: string;
  purpose?: string;
  config_details?: string;
  health_check_type?: string;
  logo_url?: string;
  last_health_check_at?: string;
  last_updated_by?: string;
  created_at?: string;
  updated_at: string;
  comment_count?: number;
  active_incidents_count?: number;
  latest_release_title?: string;
  latest_release_version?: string;
  latest_release_date?: string;
  hasActiveIncident?: boolean;
  activeIncidentSummary?: string;
}

interface SystemCardProps {
  system: SystemItemData;
  onViewDetails: (system: SystemItemData) => void;
  onOpenComments: (system: SystemItemData) => void;
  onEditSystem?: (system: SystemItemData) => void;
  isAdmin?: boolean;
}

export function SystemCard({
  system,
  onViewDetails,
  onOpenComments,
  onEditSystem,
  isAdmin,
}: SystemCardProps) {
  const getStatusBadge = () => {
    switch (system.status) {
      case 'OPERATIONAL':
        return {
          label: 'Operational',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotClass: 'bg-emerald-500',
        };
      case 'DEGRADED':
        return {
          label: 'Degraded',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dotClass: 'bg-amber-500',
        };
      case 'UNAVAILABLE':
        return {
          label: 'Unavailable',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dotClass: 'bg-[#EA2839]',
        };
      default:
        return {
          label: 'Maintenance',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dotClass: 'bg-[#0077C8]',
        };
    }
  };

  const status = getStatusBadge();
  const activeIncidents = system.active_incidents_count || (system.hasActiveIncident ? 1 : 0);
  const commentsCount = system.comment_count || 0;

  // Render system icon matching reference image
  const renderSystemIcon = () => {
    if (system.logo_url) {
      return (
        <img
          src={system.logo_url}
          alt={`${system.name} logo`}
          className="w-full h-full object-contain"
        />
      );
    }

    const s = (system.slug || system.name).toLowerCase();
    if (s.includes('gate2hotels') || s.includes('g2h')) {
      return (
        <div className="w-full h-full bg-[#0F2038] text-white rounded-lg flex items-center justify-center font-bold text-[11px] tracking-wider">
          G2H
        </div>
      );
    }
    if (s.includes('flight') || s.includes('ticket')) {
      return <Plane className="w-5 h-5 text-[#0077C8]" />;
    }
    if (s.includes('extranet') || s.includes('hotel')) {
      return <Building2 className="w-5 h-5 text-slate-700" />;
    }
    if (s.includes('channel') || s.includes('sync')) {
      return <Database className="w-5 h-5 text-[#0077C8]" />;
    }
    if (s.includes('attendance') || s.includes('hr')) {
      return <Users className="w-5 h-5 text-[#0077C8]" />;
    }
    if (s.includes('website') || s.includes('corporate')) {
      return <Globe className="w-5 h-5 text-[#0077C8]" />;
    }

    return <Server className="w-5 h-5 text-slate-600" />;
  };

  return (
    <div
      onClick={() => onViewDetails(system)}
      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-[#0077C8] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative"
    >
      {/* Top Row: Logo & Names */}
      <div>
        <div className="flex items-start gap-3">
          {/* 44x44px Rounded-xl Logo / Icon Container */}
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden p-1 group-hover:border-blue-300 transition-colors">
            {renderSystemIcon()}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug group-hover:text-[#0077C8] transition-colors truncate">
              {system.name}
            </h3>
            <div className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
              {system.category || 'Core Service'}
            </div>
          </div>

          {/* Quick Edit Icon for Managers */}
          {isAdmin && onEditSystem && (
            <button
              id={`edit-system-${system.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditSystem(system);
              }}
              title="Edit system configuration & logo"
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#0077C8] hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Operational Status Pill */}
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${status.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}></span>
            {status.label}
          </span>
        </div>
      </div>

      {/* Bottom Meta Bar: Chat Count, Alert Count, Updated ago, and Chevron */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-3">
          {/* Chat count */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(system);
            }}
            className="flex items-center gap-1 hover:text-[#0077C8] transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>{commentsCount}</span>
          </div>

          {/* Alert count */}
          <div className="flex items-center gap-1">
            <AlertTriangle
              className={`w-3.5 h-3.5 ${activeIncidents > 0 ? 'text-[#EA2839]' : 'text-slate-400'}`}
            />
            <span className={activeIncidents > 0 ? 'text-[#EA2839] font-bold' : ''}>
              {activeIncidents}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">Updated 14 ago</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0077C8] group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}
