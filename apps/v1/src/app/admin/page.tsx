'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
  PauseCircle,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Organiser, Event, PlatformAnalytics } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';

export default function PlatformAdminPage() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
        setOrganisers(data.organisers || []);
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleOrganiserStatus = async (org: Organiser) => {
    const nextStatus = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingId(org.id);

    try {
      const res = await fetch('/api/admin/organisers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: org.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      } else {
        alert(data.error || 'Status update failed');
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6A1A] border-r-2 border-transparent" />
        <p className="text-sm text-white/50">Accessing platform administration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#FF9A45]" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Platform Administration</h1>
            <GlassBadge variant="error">Root Privileges</GlassBadge>
          </div>
          <p className="text-xs text-white/50 pt-1">
            Global governance, organiser suspension, marketplace moderation & volume oversight.
          </p>
        </div>
        <div className="text-xs text-white/40 font-mono">Role: SUPER_ADMIN (Server Authorised)</div>
      </div>

      {/* Platform Macro Metrics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard padding="sm" className="space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Total Ecosystem Volume</span>
            <p className="text-xl font-bold text-[#FF9A45]">{formatINR(analytics.totalPlatformVolumeInPence)}</p>
            <span className="text-[10px] text-white/50">Across all active organisers</span>
          </GlassCard>

          <GlassCard padding="sm" className="space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Platform Fees Accrued</span>
            <p className="text-xl font-bold text-emerald-400">{formatINR(analytics.platformFeesEarnedInPence)}</p>
            <span className="text-[10px] text-white/50">2.5% take rate</span>
          </GlassCard>

          <GlassCard padding="sm" className="space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Active Organisers</span>
            <p className="text-xl font-bold text-white">
              {analytics.activeOrganisers} / {analytics.totalOrganisers}
            </p>
            <span className="text-[10px] text-white/50">Verified SaaS tenants</span>
          </GlassCard>

          <GlassCard padding="sm" className="space-y-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider block">Total Tickets Minted</span>
            <p className="text-xl font-bold text-white">{analytics.totalTicketsSold}</p>
            <span className="text-[10px] text-white/50">{analytics.activeEvents} live events</span>
          </GlassCard>
        </div>
      )}

      {/* Organisers Moderation Table */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#FF9A45]" />
            <span>Organiser Directory & Moderation</span>
          </h2>
          <span className="text-xs text-white/40">{organisers.length} Registered Tenants</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-white/40 pb-2">
                <th className="py-2">Tenant Name</th>
                <th className="py-2">Support Contact</th>
                <th className="py-2">Payout UPI</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Moderation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {organisers.map((org) => (
                <tr key={org.id} className="text-white/80">
                  <td className="py-3 font-semibold text-white">{org.businessName}</td>
                  <td className="py-3">{org.supportEmail}</td>
                  <td className="py-3 font-mono text-[#FF9A45]">{org.payoutUpiId || 'Unset'}</td>
                  <td className="py-3">
                    <GlassBadge
                      variant={org.status === 'ACTIVE' ? 'success' : 'error'}
                      size="sm"
                    >
                      {org.status}
                    </GlassBadge>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleToggleOrganiserStatus(org)}
                      disabled={updatingId === org.id}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        org.status === 'ACTIVE'
                          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {org.status === 'ACTIVE' ? (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Global Events Audit */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Platform Events Catalog</span>
          </h2>
          <span className="text-xs text-white/40">{events.length} Listed Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-white/40 pb-2">
                <th className="py-2">Event Title</th>
                <th className="py-2">Category</th>
                <th className="py-2">City</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {events.map((evt) => (
                <tr key={evt.id} className="text-white/80">
                  <td className="py-3 font-semibold text-white">{evt.title}</td>
                  <td className="py-3">{evt.category}</td>
                  <td className="py-3">{evt.venue.city}</td>
                  <td className="py-3">
                    <GlassBadge variant={evt.status === 'PUBLISHED' ? 'success' : 'warning'} size="sm">
                      {evt.status}
                    </GlassBadge>
                  </td>
                  <td className="py-3 text-white/60">
                    {new Date(evt.schedule.startsAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

