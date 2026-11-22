'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Plus,
  QrCode,
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '@firefly/ui';
import { Event, TicketTier, OrganiserAnalytics, CheckInResponse } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';

export default function OrganiserDashboardPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'scanner' | 'analytics'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<OrganiserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Event Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    tagline: '',
    description: '',
    category: 'MUSIC_FESTIVAL',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    venueName: '',
    address: '',
    city: 'Hyderabad',
    startsAt: '2026-12-20T18:00',
    endsAt: '2026-12-21T02:00',
  });
  const [creating, setCreating] = useState(false);

  // Scanner State
  const [scannerEventId, setScannerEventId] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [eventsRes, analyticsRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/organiser/analytics'),
      ]);
      const eventsData = await eventsRes.json();
      const analyticsData = await analyticsRes.json();

      if (eventsData.success) {
        setEvents(eventsData.events || []);
        if (eventsData.events?.length > 0 && !scannerEventId) {
          setScannerEventId(eventsData.events[0].id);
        }
      }
      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
      }
    } catch (err) {
      console.error('Failed to load organiser data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const payload = {
        title: newEvent.title,
        tagline: newEvent.tagline,
        description: newEvent.description,
        category: newEvent.category,
        posterUrl: newEvent.posterUrl,
        venue: {
          name: newEvent.venueName,
          address: newEvent.address,
          city: newEvent.city,
          state: 'Telangana',
          postalCode: '500081',
          country: 'India',
          googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(newEvent.venueName + ' ' + newEvent.city)}`,
        },
        schedule: {
          startsAt: new Date(newEvent.startsAt).toISOString(),
          endsAt: new Date(newEvent.endsAt).toISOString(),
          timezone: 'Asia/Kolkata',
        },
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to create event');
      }
    } catch (err: any) {
      alert(err.message || 'Creation error');
    } finally {
      setCreating(false);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || !scannerEventId) return;

    setScanning(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: manualCode.trim(),
          eventId: scannerEventId,
          scannerUserId: 'ORGANISER-AGENT-1',
        }),
      });

      const data = await res.json();
      setScanResult(data.result);
      if (data.result?.status === 'SUCCESS') {
        fetchDashboardData(); // update stats
      }
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Organiser Command Center</h1>
            <GlassBadge variant="accent">Lumina Experiences</GlassBadge>
          </div>
          <p className="text-xs text-white/50 pt-1">
            Multi-event management, gate check-in scanner, and real-time revenue analytics.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'events' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            Events & Tiers
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'scanner' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Gate Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'analytics' ? 'bg-white/[0.12] text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sales Analytics</span>
          </button>
        </div>
      </div>

      {/* TAB 1: EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Your Events</span>
              <span className="text-xs font-normal text-white/40">({events.length})</span>
            </h2>
            <GlassButton variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create New Event</span>
            </GlassButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt) => (
              <GlassCard key={evt.id} padding="none" className="flex flex-col">
                <div className="relative h-40 w-full overflow-hidden bg-neutral-900">
                  <img src={evt.posterUrl} alt={evt.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <GlassBadge variant="accent" size="sm">{evt.category}</GlassBadge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <GlassBadge variant={evt.status === 'PUBLISHED' ? 'success' : 'warning'} size="sm">
                      {evt.status}
                    </GlassBadge>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-white">{evt.title}</h3>
                    <p className="text-xs text-white/60 line-clamp-1">{evt.venue.name}, {evt.venue.city}</p>
                    <p className="text-xs text-white/40">
                      {new Date(evt.schedule.startsAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-white/60">Tickets: Active</span>
                    <button
                      onClick={() => {
                        setScannerEventId(evt.id);
                        setActiveTab('scanner');
                      }}
                      className="text-[#FF9A45] hover:underline flex items-center gap-1 font-medium"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Launch Scanner</span>
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: GATE SCANNER */}
      {activeTab === 'scanner' && (
        <div className="max-w-xl mx-auto space-y-6">
          <GlassCard className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#FF9A45]" />
                <h2 className="text-base font-bold text-white">Live Gate Entrance Scanner</h2>
              </div>
              <GlassBadge variant="accent">Active Gate</GlassBadge>
            </div>

            {/* Event Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider block">
                Active Event Verification Context
              </label>
              <select
                value={scannerEventId}
                onChange={(e) => setScannerEventId(e.target.value)}
                className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-2.5 text-xs text-white outline-none focus:border-[#FF6A1A]"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id} className="bg-neutral-900 text-white">
                    {e.title} ({e.venue.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Scanner Input Form */}
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <GlassInput
                label="Scan QR Code / Enter Token"
                placeholder="Scan QR code or paste payload (e.g. FF1.<ticketId>...)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                helperText="Use barcode/QR laser scanner, camera stream or manual token lookup"
                required
              />

              <GlassButton type="submit" variant="primary" fullWidth isLoading={scanning}>
                Verify & Admit Attendee
              </GlassButton>
            </form>

            {/* Scan Result Feedback Banner */}
            {scanResult && (
              <div
                className={`p-4 rounded-xl border space-y-2 transition-all ${
                  scanResult.status === 'SUCCESS'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {scanResult.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  )}
                  <span>{scanResult.message}</span>
                </div>

                {scanResult.ticket && (
                  <div className="pt-2 border-t border-current/20 text-xs space-y-1 opacity-90">
                    <div>Attendee: <span className="font-semibold">{scanResult.ticket.attendeeName}</span></div>
                    <div>Tier: <span className="font-semibold">{scanResult.ticket.tierName}</span></div>
                    <div>Pass Number: <span className="font-mono">{scanResult.ticket.ticketNumber}</span></div>
                    {scanResult.ticket.checkedInAt && (
                      <div>Checked in at: <span>{new Date(scanResult.ticket.checkedInAt).toLocaleTimeString()}</span></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard padding="sm" className="space-y-1">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Gross Sales</span>
              <p className="text-xl font-bold text-[#FF9A45]">{formatINR(analytics.grossSalesInPence)}</p>
              <span className="text-[10px] text-white/50">Total transaction volume</span>
            </GlassCard>

            <GlassCard padding="sm" className="space-y-1">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Net Revenue</span>
              <p className="text-xl font-bold text-white">{formatINR(analytics.netSalesInPence)}</p>
              <span className="text-[10px] text-white/50">Excluding platform fee</span>
            </GlassCard>

            <GlassCard padding="sm" className="space-y-1">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Tickets Sold</span>
              <p className="text-xl font-bold text-white">
                {analytics.totalTicketsSold} / {analytics.totalTicketsCapacity}
              </p>
              <span className="text-[10px] text-white/50">Across active tiers</span>
            </GlassCard>

            <GlassCard padding="sm" className="space-y-1">
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Attendance Rate</span>
              <p className="text-xl font-bold text-emerald-400">{analytics.checkInRatePercent}%</p>
              <span className="text-[10px] text-white/50">{analytics.totalCheckIns} gate check-ins</span>
            </GlassCard>
          </div>

          {/* Breakdown Table by Tier */}
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tier Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-white/40 pb-2">
                    <th className="py-2">Tier Name</th>
                    <th className="py-2">Tickets Sold</th>
                    <th className="py-2">Capacity</th>
                    <th className="py-2">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {analytics.salesByTier.map((t) => (
                    <tr key={t.tierId} className="text-white/80">
                      <td className="py-3 font-semibold text-white">{t.tierName}</td>
                      <td className="py-3">{t.soldCount}</td>
                      <td className="py-3">{t.capacity}</td>
                      <td className="py-3 font-medium text-[#FF9A45]">{formatINR(t.revenueInPence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Modal: Create Event */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">Create New Event</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/60 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <GlassInput
                label="Event Title"
                placeholder="e.g. Neon Horizon Festival"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />
              <GlassInput
                label="Tagline"
                placeholder="Short captivating phrase"
                value={newEvent.tagline}
                onChange={(e) => setNewEvent({ ...newEvent, tagline: e.target.value })}
              />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 uppercase">Category</label>
                <select
                  value={newEvent.category}
                  onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-2.5 text-xs text-white"
                >
                  <option value="MUSIC_FESTIVAL" className="bg-neutral-900">Music Festival</option>
                  <option value="CONCERT" className="bg-neutral-900">Concert</option>
                  <option value="EXHIBITION" className="bg-neutral-900">Exhibition</option>
                  <option value="NIGHTLIFE" className="bg-neutral-900">Nightlife</option>
                  <option value="CONFERENCE" className="bg-neutral-900">Conference</option>
                </select>
              </div>
              <GlassInput
                label="Venue Name"
                placeholder="e.g. HITEX Exhibition Centre"
                value={newEvent.venueName}
                onChange={(e) => setNewEvent({ ...newEvent, venueName: e.target.value })}
                required
              />
              <GlassInput
                label="City"
                placeholder="Hyderabad"
                value={newEvent.city}
                onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                required
              />
              <GlassInput
                label="Poster Image URL"
                placeholder="https://..."
                value={newEvent.posterUrl}
                onChange={(e) => setNewEvent({ ...newEvent, posterUrl: e.target.value })}
                required
              />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 uppercase">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] p-3 text-xs text-white"
                  placeholder="Detailed description..."
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <GlassButton type="button" variant="secondary" fullWidth onClick={() => setShowCreateModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" fullWidth isLoading={creating}>
                  Publish Event
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

