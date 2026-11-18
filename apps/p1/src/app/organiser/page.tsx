'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  ImageIcon,
  MapPin,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '@firefly/ui';
import { Booking, Event, TicketTier, CheckInResponse } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage, P1OrganiserConfig } from '@/lib/idb-storage';
import { compressImageToDataUrl } from '@/lib/image';

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

  // Banner Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = () => {
    const b = p1Storage.getBookings();
    const e = p1Storage.getEvent();
    const t = p1Storage.getTiers();
    const c = p1Storage.getConfig();

    setBookings(b);
    setEvent(e);
    setTiers(t);
    setConfig(c);
    if (e?.posterUrl) {
      setBannerPreview(e.posterUrl);
    }
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

  // Image Upload Handler
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 1200, 800, 0.82);
      setBannerPreview(compressedDataUrl);
      if (event) {
        setEvent({
          ...event,
          posterUrl: compressedDataUrl,
        });
      }
    } catch (err) {
      console.error('Failed to compress image:', err);
      alert('Could not process image file. Please try another image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveAllSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !event) return;

    // Save event details including new banner photo
    p1Storage.updateEvent({
      title: event.title,
      tagline: event.tagline,
      description: event.description,
      posterUrl: bannerPreview || event.posterUrl,
      venue: event.venue,
    });

    // Save UPI config
    p1Storage.updateConfig(config);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    loadData();
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
            <GlassBadge variant="accent">P1 Rapid Prototype</GlassBadge>
          </div>
          <p className="text-xs text-white/50 pt-0.5">
            Event banner upload, manual UPI verification, gate check-in scanner & tier rates.
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
            <span>Event & Banner</span>
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

      {/* TAB 3: SETTINGS & BANNER UPLOAD */}
      {activeTab === 'settings' && config && event && (
        <div className="space-y-6 max-w-xl mx-auto">
          <form onSubmit={handleSaveAllSettings} className="space-y-6">
            {/* Event Banner Photo Upload Card */}
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#FF9A45]" />
                  <span>Event Banner Photo Upload</span>
                </h2>
                <GlassBadge variant="accent">Cover Visual</GlassBadge>
              </div>

              {/* Current Banner Preview */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70 uppercase">Banner Preview</label>
                <div className="relative h-44 rounded-xl overflow-hidden border border-white/[0.12] bg-neutral-900 group">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Event Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/40 space-y-1">
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-xs">No banner image uploaded</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-medium border border-white/30 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Replace Photo</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFileChange}
                className="hidden"
              />

              {/* Drag and Drop / Click Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-5 rounded-xl border border-dashed border-white/20 hover:border-[#FF6A1A]/60 bg-white/[0.02] hover:bg-white/[0.04] text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mx-auto text-[#FF9A45]">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Click to upload custom event banner</p>
                  <p className="text-[11px] text-white/40">PNG, JPG, WebP (Automatically compressed and optimized)</p>
                </div>
                {uploadingImage && (
                  <p className="text-xs text-[#FF9A45] animate-pulse">Compressing and processing photo...</p>
                )}
              </div>
            </GlassCard>

            {/* Event Info Card */}
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF9A45]" />
                  <span>Event Details</span>
                </h2>
              </div>

              <GlassInput
                label="Event Title"
                value={event.title}
                onChange={(e) => setEvent({ ...event, title: e.target.value })}
                required
              />
              <GlassInput
                label="Tagline"
                value={event.tagline || ''}
                onChange={(e) => setEvent({ ...event, tagline: e.target.value })}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/70 tracking-wide uppercase">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={event.description}
                  onChange={(e) => setEvent({ ...event, description: e.target.value })}
                  className="w-full rounded-xl bg-white/[0.04] px-4 py-3 text-xs text-white placeholder-white/30 backdrop-blur-md border border-white/[0.08] focus:border-[#FF6A1A]/50 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <GlassInput
                  label="Venue Name"
                  value={event.venue.name}
                  onChange={(e) =>
                    setEvent({
                      ...event,
                      venue: { ...event.venue, name: e.target.value },
                    })
                  }
                  required
                />
                <GlassInput
                  label="City"
                  value={event.venue.city}
                  onChange={(e) =>
                    setEvent({
                      ...event,
                      venue: { ...event.venue, city: e.target.value },
                    })
                  }
                  required
                />
              </div>

              <GlassInput
                label="Google Maps Pin URL"
                value={event.venue.googleMapsUrl || ''}
                onChange={(e) =>
                  setEvent({
                    ...event,
                    venue: { ...event.venue, googleMapsUrl: e.target.value },
                  })
                }
                helperText="Link attendees can tap to open Google Maps"
              />
            </GlassCard>

            {/* UPI & Payment Settings */}
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>UPI Payment Details</span>
                </h2>
                <GlassBadge variant="success">Direct Payee</GlassBadge>
              </div>

              <GlassInput
                label="Receiving UPI ID"
                value={config.upiId}
                onChange={(e) => setConfig({ ...config, upiId: e.target.value })}
                helperText="UPI ID printed in the autogenerated payment QR code"
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
                helperText="Phone number customers message payment screenshots to"
                required
              />
              <GlassInput
                label="Console Passcode (PIN)"
                value={config.pin}
                onChange={(e) => setConfig({ ...config, pin: e.target.value })}
                required
              />
            </GlassCard>

            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Event details and banner photo successfully saved!</span>
              </div>
            )}

            <GlassButton type="submit" variant="primary" fullWidth size="lg">
              Save Event & Banner Changes
            </GlassButton>
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
