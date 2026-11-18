'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  Sparkles,
  ArrowLeft,
  Zap,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '@firefly/ui';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';

export default function P1EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idOrSlug = params?.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({
    fullName: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (idOrSlug) {
      const evt = p1Storage.getEvent(idOrSlug);
      if (evt) {
        setEvent(evt);
        const t = p1Storage.getTiers(evt.id);
        setTiers(t);
        if (t.length > 0) {
          setQuantities({ [t[0].id]: 1 });
        }
      }
    }
  }, [idOrSlug]);

  const updateQty = (tierId: string, delta: number, max: number) => {
    const cur = quantities[tierId] || 0;
    const next = Math.max(0, Math.min(max, cur + delta));
    setQuantities((prev) => ({ ...prev, [tierId]: next }));
  };

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);
  let totalAmountInPence = 0;
  tiers.forEach((t) => {
    totalAmountInPence += t.priceInPence * (quantities[t.id] || 0);
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (totalTickets === 0) {
      setError('Please select at least 1 ticket to book.');
      return;
    }
    if (!customer.fullName.trim()) {
      setError('Please provide your name.');
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tierId, quantity]) => ({ tierId, quantity }));

    const res = p1Storage.createBooking({
      eventId: event.id,
      customer: {
        fullName: customer.fullName.trim(),
        phone: cleanPhone,
      },
      items,
    });

    if (res.success && res.booking) {
      router.push(`/pay/${res.booking.id}`);
    } else {
      setError(res.error || 'Failed to create booking.');
      setSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <Link href="/">
          <GlassButton variant="secondary">Back to Events</GlassButton>
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = new Date(event.schedule.startsAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = new Date(event.schedule.endsAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Events</span>
        </Link>
      </div>

      {/* Hero Banner */}
      <GlassCard padding="none" className="relative overflow-hidden">
        <div className="relative h-64 md:h-80 w-full">
          <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/60 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <GlassBadge variant="accent">{event.category.replace('_', ' ')}</GlassBadge>
            {event.isAgeRestricted && <GlassBadge variant="error">{event.minimumAge}+ Only</GlassBadge>}
          </div>
          <div className="absolute bottom-6 left-6 right-6 space-y-1.5">
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">{event.title}</h1>
            {event.tagline && <p className="text-xs md:text-sm text-white/80 max-w-2xl">{event.tagline}</p>}
          </div>
        </div>
      </GlassCard>

      {/* Main Grid: Details + Ticket Booking */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Event details, timing & Google Maps link */}
        <div className="md:col-span-6 space-y-5">
          <GlassCard className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Date & Venue</h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#FF9A45] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">{startDate}</p>
                  <p className="text-white/50">{startTime} to {endTime} ({event.schedule.timezone})</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#FF9A45] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">{event.venue.name}</p>
                  <p className="text-white/50">{event.venue.address}, {event.venue.city}</p>
                  {event.venue.googleMapsUrl && (
                    <a
                      href={event.venue.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#FF9A45] hover:underline pt-1 text-[11px]"
                    >
                      <span>Open Location in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">About Event</h3>
            <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line">{event.description}</p>
            {event.termsAndConditions && (
              <div className="pt-3 border-t border-white/[0.06]">
                <p className="text-[11px] text-white/50">{event.termsAndConditions}</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Select Tickets & Customer Info (NO EMAIL) */}
        <div className="md:col-span-6">
          <form onSubmit={handleBookingSubmit} className="space-y-5">
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FF9A45]" />
                  <span>Select Tickets</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono">No Gateway Surcharges</span>
              </div>

              {/* Tiers List */}
              <div className="space-y-3">
                {tiers.map((t) => {
                  const qty = quantities[t.id] || 0;
                  const available = Math.max(0, t.capacity - t.soldCount);
                  const isSoldOut = available <= 0;

                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        qty > 0 ? 'bg-[#FF6A1A]/10 border-[#FF6A1A]/40' : 'bg-white/[0.02] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-white">{t.name}</h4>
                          <p className="text-xs text-white/50">{t.description}</p>
                          <p className="text-sm font-semibold text-[#FF9A45] pt-1">{formatINR(t.priceInPence)}</p>
                        </div>

                        {isSoldOut ? (
                          <GlassBadge variant="error" size="sm">Sold Out</GlassBadge>
                        ) : (
                          <div className="flex items-center gap-2 bg-white/[0.05] p-1 rounded-lg border border-white/[0.08]">
                            <button
                              type="button"
                              onClick={() => updateQty(t.id, -1, t.maxPerBooking)}
                              disabled={qty === 0}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs disabled:opacity-30"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-semibold text-white w-4 text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(t.id, 1, Math.min(t.maxPerBooking, available))}
                              disabled={qty >= t.maxPerBooking || qty >= available}
                              className="w-6 h-6 flex items-center justify-center rounded bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs disabled:opacity-30"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {t.perks && (
                        <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex flex-wrap gap-2 text-[10px] text-white/60">
                          {t.perks.map((p, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{p}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Customer Contact Info: NAME AND MOBILE ONLY (NO EMAIL) */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                    Attendee Information
                  </span>
                  <span className="text-[10px] text-white/40">No registration needed</span>
                </div>

                <GlassInput
                  label="Customer Full Name"
                  placeholder="e.g. Rahul Verma"
                  value={customer.fullName}
                  onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                  required
                />
                <GlassInput
                  label="Mobile Number (WhatsApp)"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  helperText="QR ticket pass will be delivered to this WhatsApp number"
                  required
                />
              </div>

              {/* Total & Action */}
              <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center text-sm font-bold text-white">
                <span>Total Amount:</span>
                <span className="text-[#FF9A45] text-lg">{formatINR(totalAmountInPence)}</span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200">
                  {error}
                </div>
              )}

              <GlassButton
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                isLoading={submitting}
                disabled={totalTickets === 0 || submitting}
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Proceed to Payment ({formatINR(totalAmountInPence)})</span>
                </div>
              </GlassButton>

              <p className="text-[11px] text-white/40 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Direct UPI Deep Link & WhatsApp QR Confirmation</span>
              </p>
            </GlassCard>
          </form>
        </div>
      </div>
    </div>
  );
}
