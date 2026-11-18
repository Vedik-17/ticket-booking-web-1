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
  Plus,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  QrCode,
  Send,
  MessageSquare,
  Upload,
  ImageIcon,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '@firefly/ui';
import { Booking, Event, TicketTier, Ticket, CheckInResponse } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';
import { compressImageToDataUrl } from '@/lib/image';

export default function P1AdminPanelPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'bookings' | 'events' | 'scanner'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tiers, setTiers] = useState<TicketTier[]>([]);

  // Recently confirmed ticket modal/drawer
  const [confirmedModal, setConfirmedModal] = useState<{
    booking: Booking;
    tickets: Ticket[];
    qrDataUrls: string[];
  } | null>(null);

  // New Event Modal State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    tagline: '',
    description: '',
    category: 'MUSIC_FESTIVAL',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    venueName: '',
    address: '',
    city: 'Hyderabad',
    googleMapsUrl: '',
    doorsOpenAt: '17:00',
    startsAt: '2026-12-20T18:00',
    endsAt: '2026-12-21T02:00',
    // Dynamic Tiers
    tier1Name: 'General Admission',
    tier1Price: '1999',
    tier1Capacity: '500',
    tier2Name: 'VIP Pass',
    tier2Price: '4999',
    tier2Capacity: '100',
  });
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Scanner State
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);

  const loadAllData = () => {
    setBookings(p1Storage.getBookings());
    setEvents(p1Storage.getEvents());
    setTiers(p1Storage.getTiers());
  };

  useEffect(() => {
    loadAllData();
  }, [isAuthenticated]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p1Storage.verifyAdminPin(pinInput)) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Manual payment verification & QR generation
  const handleConfirmBooking = async (bookingId: string) => {
    const res = await p1Storage.confirmBookingAndGenerateTickets(bookingId);
    if (res.success && res.booking && res.tickets) {
      loadAllData();
      setConfirmedModal({
        booking: res.booking,
        tickets: res.tickets,
        qrDataUrls: res.qrDataUrls || [],
      });
    }
  };

  // Banner Image Upload for New Event
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const dataUrl = await compressImageToDataUrl(file, 1200, 800, 0.82);
      setBannerPreview(dataUrl);
      setNewEvent((prev) => ({ ...prev, posterUrl: dataUrl }));
    } catch (err) {
      alert('Could not compress image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Create Event Form Submit
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.venueName.trim()) {
      alert('Please fill in title and venue');
      return;
    }

    const created = p1Storage.createEvent({
      organiserId: 'org-1',
      title: newEvent.title,
      slug: newEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${Date.now().toString(36).substring(2, 6)}`,
      tagline: newEvent.tagline,
      description: newEvent.description,
      category: newEvent.category as any,
      status: 'PUBLISHED',
      posterUrl: newEvent.posterUrl,
      galleryUrls: [],
      venue: {
        name: newEvent.venueName,
        address: newEvent.address,
        city: newEvent.city,
        state: 'Telangana',
        postalCode: '500081',
        country: 'India',
        googleMapsUrl: newEvent.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(newEvent.venueName + ' ' + newEvent.city)}`,
      },
      schedule: {
        doorsOpenAt: newEvent.startsAt,
        startsAt: new Date(newEvent.startsAt).toISOString(),
        endsAt: new Date(newEvent.endsAt).toISOString(),
        timezone: 'Asia/Kolkata',
      },
      isAgeRestricted: false,
      featured: true,
    });

    // Create tiers
    if (newEvent.tier1Name && newEvent.tier1Price) {
      p1Storage.createTier({
        eventId: created.id,
        name: newEvent.tier1Name,
        priceInPence: Math.round(Number(newEvent.tier1Price) * 100),
        currency: 'INR',
        capacity: Number(newEvent.tier1Capacity) || 500,
        minPerBooking: 1,
        maxPerBooking: 6,
        salesStartAt: new Date().toISOString(),
        salesEndAt: new Date(newEvent.endsAt).toISOString(),
        status: 'ACTIVE',
        perks: ['Standard Entry'],
      });
    }

    if (newEvent.tier2Name && newEvent.tier2Price) {
      p1Storage.createTier({
        eventId: created.id,
        name: newEvent.tier2Name,
        priceInPence: Math.round(Number(newEvent.tier2Price) * 100),
        currency: 'INR',
        capacity: Number(newEvent.tier2Capacity) || 100,
        minPerBooking: 1,
        maxPerBooking: 4,
        salesStartAt: new Date().toISOString(),
        salesEndAt: new Date(newEvent.endsAt).toISOString(),
        status: 'ACTIVE',
        perks: ['VIP Lounge Access'],
      });
    }

    setShowAddEventModal(false);
    loadAllData();
    alert('Event created and published successfully!');
  };

  // Gate Scanner
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const res = p1Storage.verifyTicketScan(manualCode.trim());
    setScanResult(res);
    loadAllData();
  };

  // Helper to build WhatsApp message to send ticket to customer
  const buildWhatsAppTicketSendUrl = (booking: Booking, ticket: Ticket) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const ticketUrl = `${origin}/ticket/${ticket.id}`;
    const event = events.find((e) => e.id === booking.eventId);

    const message =
      `Hello ${booking.customer.fullName}!\n\n` +
      `Your ticket for "${event?.title || 'Event'}" has been CONFIRMED!\n\n` +
      `• Ticket No: ${ticket.ticketNumber}\n` +
      `• Tier: ${ticket.tierName}\n` +
      `• Attendee: ${ticket.attendeeName}\n\n` +
      `Access your official QR Entry Pass here:\n${ticketUrl}\n\n` +
      `Please have your QR code ready for gate scanning at the entrance.`;

    const cleanPhone = booking.customer.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  };

  // PIN Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-xs mx-auto py-16 space-y-6">
        <GlassCard className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF6A1A]/15 border border-[#FF6A1A]/30 flex items-center justify-center mx-auto text-[#FF9A45]">
            <Lock className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Admin Panel Access</h2>
            <p className="text-xs text-white/50">Enter the 6-digit administration passcode</p>
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

            {pinError && <p className="text-xs text-red-400">Incorrect PIN. (Default: 123456)</p>}

            <GlassButton type="submit" variant="primary" fullWidth size="md">
              Enter Admin Panel
            </GlassButton>
          </form>

          <p className="text-[10px] text-white/40">Default Passcode: 123456</p>
        </GlassCard>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === 'PAYMENT_PENDING');
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const totalGrossPence = confirmedBookings.reduce((sum, b) => sum + b.totalAmountInPence, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Admin Control Panel</h1>
            <GlassBadge variant="accent">Direct UPI Edition</GlassBadge>
          </div>
          <p className="text-xs text-white/50 pt-0.5">
            Manual booking verification, QR code generation, WhatsApp dispatch & event management.
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
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              activeTab === 'events' ? 'bg-white/[0.12] text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Manage Events ({events.length})</span>
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
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Total Collected</span>
          <p className="text-base font-bold text-[#FF9A45]">{formatINR(totalGrossPence)}</p>
        </GlassCard>
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Awaiting Confirmation</span>
          <p className="text-base font-bold text-amber-400">{pendingBookings.length}</p>
        </GlassCard>
        <GlassCard padding="sm" className="space-y-0.5">
          <span className="text-[10px] text-white/40 uppercase">Active Events</span>
          <p className="text-base font-bold text-white">{events.length}</p>
        </GlassCard>
      </div>

      {/* TAB 1: BOOKINGS & MANUAL CONFIRMATION */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Customer Bookings
            </h2>
            <span className="text-xs text-white/40">Only Name & Mobile (Zero Email)</span>
          </div>

          {bookings.length === 0 ? (
            <GlassCard className="text-center py-10 space-y-2">
              <p className="text-xs text-white/50">No customer bookings yet.</p>
              <Link href="/" className="text-xs text-[#FF9A45] hover:underline">
                Place a test booking on the events page
              </Link>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const event = events.find((e) => e.id === b.eventId);
                const issuedTickets = p1Storage.getTicketsByBookingId(b.id);
                const firstTicket = issuedTickets[0];

                return (
                  <GlassCard key={b.id} padding="sm" className="space-y-3 text-xs">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-2 border-b border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{b.bookingReference}</span>
                        <GlassBadge variant={b.status === 'CONFIRMED' ? 'success' : 'warning'} size="sm">
                          {b.status}
                        </GlassBadge>
                        <span className="text-white/40">•</span>
                        <span className="text-white/70 font-semibold">{event?.title}</span>
                      </div>

                      <span className="font-bold text-[#FF9A45] text-sm">
                        {formatINR(b.totalAmountInPence)}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Customer Info (Name and Phone only) */}
                      <div className="space-y-1">
                        <p className="text-white font-medium text-sm">
                          {b.customer.fullName}{' '}
                          <span className="text-white/50 text-xs font-mono font-normal">
                            ({b.customer.phone})
                          </span>
                        </p>
                        <p className="text-white/60">
                          Tickets:{' '}
                          <span className="text-white font-medium">
                            {b.items.map((i) => `${i.quantity}x ${i.tierName}`).join(', ')}
                          </span>
                        </p>
                      </div>

                      {/* Action: Manual Confirm & WhatsApp Send */}
                      <div className="flex flex-wrap items-center gap-2">
                        {b.status === 'PAYMENT_PENDING' ? (
                          <GlassButton
                            size="sm"
                            variant="primary"
                            onClick={() => handleConfirmBooking(b.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />
                            <span>Confirm Payment & Generate QR</span>
                          </GlassButton>
                        ) : (
                          <>
                            {firstTicket && (
                              <a
                                href={buildWhatsAppTicketSendUrl(b, firstTicket)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <GlassButton size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-500">
                                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                  <span>Send Ticket via WhatsApp</span>
                                </GlassButton>
                              </a>
                            )}
                            <Link href={`/ticket/${firstTicket?.id || ''}`}>
                              <GlassButton size="sm" variant="secondary">
                                View Pass
                              </GlassButton>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANAGE & ADD EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Platform Events Catalog
            </h2>
            <GlassButton size="sm" variant="primary" onClick={() => setShowAddEventModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add New Event</span>
            </GlassButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => (
              <GlassCard key={evt.id} padding="none" className="flex flex-col text-xs">
                <div className="relative h-36 w-full overflow-hidden bg-neutral-900">
                  <img src={evt.posterUrl} alt={evt.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-80" />
                  <div className="absolute top-2.5 left-2.5">
                    <GlassBadge variant="accent" size="sm">{evt.category}</GlassBadge>
                  </div>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm line-clamp-1">{evt.title}</h3>
                    <p className="text-white/60 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#FF9A45]" />
                      <span>{evt.venue.name}, {evt.venue.city}</span>
                    </p>
                    <p className="text-white/40 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(evt.schedule.startsAt).toLocaleDateString()}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <Link href={`/event/${evt.slug || evt.id}`} className="text-[#FF9A45] hover:underline font-semibold flex items-center gap-1">
                      <span>Preview Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={() => {
                        if (confirm(`Delete event "${evt.title}"?`)) {
                          p1Storage.deleteEvent(evt.id);
                          loadAllData();
                        }
                      }}
                      className="text-white/40 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GATE SCANNER */}
      {activeTab === 'scanner' && (
        <div className="max-w-md mx-auto space-y-4">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#FF9A45]" />
                <span>Gate Entrance QR Scanner</span>
              </h2>
              <GlassBadge variant="accent">Central Check-in</GlassBadge>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-3">
              <GlassInput
                label="Scan Ticket QR / Paste Code"
                placeholder="Scan or paste FF1.<ticketId>..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                required
              />
              <GlassButton type="submit" variant="primary" fullWidth size="md">
                Verify & Admit Attendee
              </GlassButton>
            </form>

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

      {/* MODAL: TICKET QR GENERATED FOR ADMIN TO DISPATCH */}
      {confirmedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto text-center">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ticket Generated for Admin</span>
              </span>
              <button onClick={() => setConfirmedModal(null)} className="text-white/60 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">{confirmedModal.booking.customer.fullName}</h3>
              <p className="text-xs text-white/50">Mobile: {confirmedModal.booking.customer.phone}</p>
              <p className="text-xs text-[#FF9A45] font-semibold">
                Ref: {confirmedModal.booking.bookingReference}
              </p>
            </div>

            {/* Generated QR Code preview for admin */}
            {confirmedModal.qrDataUrls.length > 0 && (
              <div className="p-3 bg-white rounded-2xl inline-block mx-auto shadow-lg">
                <img src={confirmedModal.qrDataUrls[0]} alt="Generated QR" className="w-48 h-48 object-contain" />
              </div>
            )}

            <p className="text-xs text-white/70">
              Pass Number: <span className="font-mono font-bold text-white">{confirmedModal.tickets[0]?.ticketNumber}</span>
            </p>

            {/* WhatsApp Send Button */}
            <div className="pt-2 space-y-2">
              <a
                href={buildWhatsAppTicketSendUrl(confirmedModal.booking, confirmedModal.tickets[0])}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <GlassButton variant="primary" fullWidth size="lg" className="bg-emerald-600 hover:bg-emerald-500">
                  <div className="flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Ticket via WhatsApp to Customer</span>
                  </div>
                </GlassButton>
              </a>

              <GlassButton variant="secondary" fullWidth size="sm" onClick={() => setConfirmedModal(null)}>
                Close
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* MODAL: ADD NEW EVENT (WITH PHOTO UPLOAD, TIMINGS, MAPS, UPI & TIERS) */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassCard className="max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white">Add New Event</h3>
              <button onClick={() => setShowAddEventModal(false)} className="text-white/60 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              {/* Photo Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase">Banner Photo</label>
                <div className="relative h-36 rounded-xl overflow-hidden border border-white/[0.12] bg-neutral-900 group">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/40 space-y-1">
                      <ImageIcon className="w-6 h-6" />
                      <span>Upload Banner Photo</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 rounded bg-white/20 text-white text-xs border border-white/30"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-xl border border-dashed border-white/20 hover:border-[#FF6A1A]/60 text-white/70 hover:text-white flex items-center justify-center gap-1.5 text-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#FF9A45]" />
                  <span>{uploadingImage ? 'Compressing...' : 'Click to Upload Banner Image'}</span>
                </button>
              </div>

              {/* Title & Tagline */}
              <GlassInput
                label="Event Title"
                placeholder="e.g. Neon Horizon Festival"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                required
              />

              <GlassInput
                label="Tagline"
                placeholder="Short captivating description"
                value={newEvent.tagline}
                onChange={(e) => setNewEvent({ ...newEvent, tagline: e.target.value })}
              />

              {/* Timings */}
              <div className="grid grid-cols-2 gap-2">
                <GlassInput
                  label="Start Date & Time"
                  type="datetime-local"
                  value={newEvent.startsAt}
                  onChange={(e) => setNewEvent({ ...newEvent, startsAt: e.target.value })}
                  required
                />
                <GlassInput
                  label="End Date & Time"
                  type="datetime-local"
                  value={newEvent.endsAt}
                  onChange={(e) => setNewEvent({ ...newEvent, endsAt: e.target.value })}
                  required
                />
              </div>

              {/* Venue & Google Maps Pin */}
              <div className="grid grid-cols-2 gap-2">
                <GlassInput
                  label="Venue Name"
                  placeholder="e.g. HITEX Arena"
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
              </div>

              <GlassInput
                label="Google Maps Location Pin URL"
                placeholder="https://maps.google.com/?q=..."
                value={newEvent.googleMapsUrl}
                onChange={(e) => setNewEvent({ ...newEvent, googleMapsUrl: e.target.value })}
                helperText="Redirects customer directly to Google Maps pin"
              />

              {/* Ticket Tiers Rates */}
              <div className="pt-2 border-t border-white/[0.08] space-y-2">
                <span className="font-semibold text-white uppercase tracking-wider block">
                  Ticket Tiers & Rates
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <GlassInput
                    label="Tier 1 Name"
                    value={newEvent.tier1Name}
                    onChange={(e) => setNewEvent({ ...newEvent, tier1Name: e.target.value })}
                  />
                  <GlassInput
                    label="Rate (₹)"
                    type="number"
                    value={newEvent.tier1Price}
                    onChange={(e) => setNewEvent({ ...newEvent, tier1Price: e.target.value })}
                  />
                  <GlassInput
                    label="Capacity"
                    type="number"
                    value={newEvent.tier1Capacity}
                    onChange={(e) => setNewEvent({ ...newEvent, tier1Capacity: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <GlassInput
                    label="Tier 2 Name"
                    value={newEvent.tier2Name}
                    onChange={(e) => setNewEvent({ ...newEvent, tier2Name: e.target.value })}
                  />
                  <GlassInput
                    label="Rate (₹)"
                    type="number"
                    value={newEvent.tier2Price}
                    onChange={(e) => setNewEvent({ ...newEvent, tier2Price: e.target.value })}
                  />
                  <GlassInput
                    label="Capacity"
                    type="number"
                    value={newEvent.tier2Capacity}
                    onChange={(e) => setNewEvent({ ...newEvent, tier2Capacity: e.target.value })}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/70 uppercase">Description</label>
                <textarea
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Full event details..."
                  className="w-full rounded-xl bg-white/[0.05] border border-white/[0.10] p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <GlassButton type="button" variant="secondary" fullWidth onClick={() => setShowAddEventModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" fullWidth>
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
