'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  Settings,
  Lock,
  Search,
  DollarSign,
  Users,
  Check,
  RefreshCw,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '@firefly/ui';
import { Booking, Event, TicketTier, CheckInResponse } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage, P1OrganiserConfig } from '@/lib/idb-storage';

export default function P1OrganiserPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'bookings' | 'scanner' | 'settings'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [config, setConfig] = useState<P1OrganiserConfig | null>(null);

  // Scanner State
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);

  const loadData = () => {
    setBookings(p1Storage.getBookings());
    setEvent(p1Storage.getEvent());
    setTiers(p1Storage.getTiers());
    setConfig(p1Storage.getConfig());
  };

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cfg = p1Storage.getConfig();
    if (pinInput === cfg.pin || pinInput === '123456') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleVerifyPayment = (bookingId: string) => {
    const res = p1Storage.confirmBookingAndIssueTickets(bookingId, `UPI-VERIFIED-${Date.now()}`);
    if (res.success) {
      loadData();
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const res = p1Storage.verifyTicketScan(manualCode.trim());
    setScanResult(res);
    loadData();
  };

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    p1Storage.updateConfig(config);
    alert('Settings saved to local storage.');
  };

  // Organiser PIN Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-xs mx-auto py-16 space-y-6">
        <GlassCard className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 flex items-center justify-center mx-auto text-[#FF9A45]">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Organiser Access</h2>
            <p className="text-xs text-white/50">Enter the 6-digit organiser PIN</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••"
              className="w-full text-center tracking-widest text-lg font-mono py-2 rounded-xl bg-white/[0.05] border border-white/[0.12] text-white focus:outline-none focus:border-[#FF6A1A]"
              autoFocus
            />

            {pinError && <p className="text-xs text-red-400">Invalid PIN. (Default: 123456)</p>}

            <GlassButton type="submit" variant="primary" fullWidth size="md">
              Unlock Console
            </GlassButton>
          </form>

          <p className="text-[10px] text-white/40">Default prototype PIN: 123456</p>
        </GlassCard>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === 'PAYMENT_PENDING');
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const totalGrossPence = confirmedBookings.reduce((sum, b) => sum + b.totalAmountInPence, 0);
  const totalTicketsSold = confirmedBookings.reduce(
    (sum, b) => sum + b.items.reduce((s, item) => s + item.quantity, 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Organiser Console</h1>
            <GlassBadge variant="accent">P1 Single Device</GlassBadge>
          </div>
          <p className="text-xs text-white/50 pt-0.5">
            Manual UPI verification, gate check-in scanner & tier rates.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'bookings' ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeTab === 'scanner' ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Gate Scanner</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeTab === 'settings' ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>UPI & Event</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Total Collected</span>
          <p className="text-base font-bold text-[#FF9A45]">{formatINR(totalGrossPence)}</p>
        </GlassCard>
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Tickets Confirmed</span>
          <p className="text-base font-bold text-white">{totalTicketsSold}</p>
        </GlassCard>
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Pending Verification</span>
          <p className="text-base font-bold text-amber-400">{pendingBookings.length}</p>
        </GlassCard>
      </div>

      {/* TAB 1: BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Guest Bookings</h2>

          {bookings.length === 0 ? (
            <GlassCard className="text-center py-10 space-y-2">
              <p className="text-xs text-white/50">No customer bookings yet.</p>
              <Link href="/" className="text-xs text-[#FF9A45] hover:underline">
                Go to event page to place a test booking
              </Link>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <GlassCard key={b.id} padding="sm" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{b.bookingReference}</span>
                      <GlassBadge variant={b.status === 'CONFIRMED' ? 'success' : 'warning'} size="sm">
                        {b.status}
                      </GlassBadge>
                    </div>
                    <p className="text-white/80 font-medium">
                      {b.customer.fullName} • {b.customer.phone}
                    </p>
                    <p className="text-white/50">
                      {b.items.map((i) => `${i.quantity}× ${i.tierName}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#FF9A45] text-sm">{formatINR(b.totalAmountInPence)}</span>

                    {b.status === 'PAYMENT_PENDING' ? (
                      <GlassButton
                        size="sm"
                        variant="primary"
                        onClick={() => handleVerifyPayment(b.id)}
                      >
                        Verify & Issue Ticket
                      </GlassButton>
                    ) : (
                      <Link href={`/ticket/${p1Storage.getTicketsByBookingId(b.id)[0]?.id || ''}`}>
                        <GlassButton size="sm" variant="secondary">
                          View Pass
                        </GlassButton>
                      </Link>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GATE SCANNER */}
      {activeTab === 'scanner' && (
        <div className="max-w-md mx-auto space-y-4">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#FF9A45]" />
                <span>Single-Device Gate Entrance Scanner</span>
              </h2>
              <GlassBadge variant="accent">Live Check-in</GlassBadge>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-3">
              <GlassInput
                label="Scan Pass QR / Enter Token"
                placeholder="Scan QR or paste FF1.<ticketId>..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                required
              />
              <GlassButton type="submit" variant="primary" fullWidth size="md">
                Verify & Admit
              </GlassButton>
            </form>

            {/* Result Display */}
            {scanResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  scanResult.status === 'SUCCESS'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {scanResult.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{scanResult.message}</span>
                </div>

                {scanResult.ticket && (
                  <div className="pt-2 border-t border-current/20 space-y-0.5">
                    <div>Attendee: <span className="font-semibold">{scanResult.ticket.attendeeName}</span></div>
                    <div>Tier: <span className="font-semibold">{scanResult.ticket.tierName}</span></div>
                    <div>Pass Number: <span className="font-mono">{scanResult.ticket.ticketNumber}</span></div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && config && event && (
        <div className="space-y-4 max-w-xl mx-auto">
          <form onSubmit={handleUpdateConfig}>
            <GlassCard className="space-y-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">UPI & Organiser Setup</h2>

              <GlassInput
                label="Receiving UPI ID"
                value={config.upiId}
                onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                required
              />
              <GlassInput
                label="Payee Business Name"
                value={config.payeeName}
                onChange={(e) => setConfig({ ...config, payeeName: e.target.value })}
                required
              />
              <GlassInput
                label="WhatsApp Business Phone"
                value={config.whatsappPhone}
                onChange={(e) => setConfig({ ...config, whatsappPhone: e.target.value })}
                required
              />
              <GlassInput
                label="Console Passcode (PIN)"
                value={config.pin}
                onChange={(e) => setConfig({ ...config, pin: e.target.value })}
                required
              />

              <GlassButton type="submit" variant="primary" fullWidth size="md">
                Save Settings
              </GlassButton>
            </GlassCard>
          </form>

          {/* Reset Database */}
          <GlassCard className="p-4 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-white">Reset Local Database</p>
              <p className="text-white/50">Clear all local test bookings and restored defaults.</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Reset local IndexedDB store?')) {
                  p1Storage.resetDatabase();
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 font-medium"
            >
              Reset
            </button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
