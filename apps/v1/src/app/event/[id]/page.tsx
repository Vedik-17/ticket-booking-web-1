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
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '@firefly/ui';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR, paiseToRupees } from '@firefly/core';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventIdOrSlug = params?.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guest details form state
  const [customer, setCustomer] = useState({
    fullName: '',
    email: '',
    phone: '',
    whatsappOptIn: true,
  });

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/events/${eventIdOrSlug}`);
        const data = await res.json();
        if (data.success && data.event) {
          setEvent(data.event);
          setTiers(data.tiers || []);
          // Initialize quantity 1 for first active tier
          if (data.tiers && data.tiers.length > 0) {
            const firstActive = data.tiers.find((t: TicketTier) => t.status === 'ACTIVE');
            if (firstActive) {
              setQuantities({ [firstActive.id]: 1 });
            }
          }
        } else {
          setError(data.error || 'Event not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load event details');
      } finally {
        setLoading(false);
      }
    }
    if (eventIdOrSlug) {
      loadEvent();
    }
  }, [eventIdOrSlug]);

  const updateQuantity = (tierId: string, delta: number, min = 0, max = 10) => {
    const current = quantities[tierId] || 0;
    const next = Math.max(0, Math.min(max, current + delta));
    setQuantities((prev) => ({
      ...prev,
      [tierId]: next,
    }));
  };

  // Calculate totals
  const totalTickets = Object.values(quantities).reduce((acc, q) => acc + q, 0);
  let subtotalInPence = 0;
  tiers.forEach((t) => {
    const q = quantities[t.id] || 0;
    subtotalInPence += t.priceInPence * q;
  });
  const serviceFeeInPence = Math.round(subtotalInPence * 0.025);
  const totalAmountInPence = subtotalInPence + serviceFeeInPence;

  const handleReserveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (totalTickets === 0) {
      setError('Please select at least 1 ticket to proceed.');
      return;
    }

    if (!customer.fullName.trim() || !customer.email.trim() || !customer.phone.trim()) {
      setError('Please fill in all customer contact details.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tierId, quantity]) => ({ tierId, quantity }));

    try {
      const res = await fetch('/api/bookings/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          organiserId: event.organiserId,
          customer,
          items,
        }),
      });

      const data = await res.json();
      if (data.success && data.booking) {
        router.push(`/booking/${data.booking.id}`);
      } else {
        setError(data.error || 'Reservation failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6A1A] border-r-2 border-transparent" />
        <p className="text-sm text-white/50">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Event Not Found</h2>
        <p className="text-white/60">The requested event could not be located or may have been unlisted.</p>
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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Events</span>
        </Link>
      </div>

      {/* Hero Banner Card */}
      <GlassCard padding="none" className="relative overflow-hidden">
        <div className="relative h-72 md:h-96 w-full">
          <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            <GlassBadge variant="accent">{event.category.replace('_', ' ')}</GlassBadge>
            {event.isAgeRestricted && (
              <GlassBadge variant="error">{event.minimumAge ? `${event.minimumAge}+ Only` : 'Age Restricted'}</GlassBadge>
            )}
          </div>
          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">{event.title}</h1>
            {event.tagline && <p className="text-sm md:text-base text-white/80 max-w-3xl">{event.tagline}</p>}
          </div>
        </div>
      </GlassCard>

      {/* Main Grid: Details (Left) + Booking (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Event Specs & About */}
        <div className="lg:col-span-7 space-y-6">
          {/* Key Schedule & Venue Card */}
          <GlassCard className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <span className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FF9A45]" />
                <span>Date & Timing</span>
              </span>
              <p className="text-sm font-semibold text-white">{startDate}</p>
              <p className="text-xs text-white/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {startTime} - {endTime} ({event.schedule.timezone})
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF9A45]" />
                <span>Venue & Location</span>
              </span>
              <p className="text-sm font-semibold text-white">{event.venue.name}</p>
              <p className="text-xs text-white/60">
                {event.venue.address}, {event.venue.city}
              </p>
              {event.venue.googleMapsUrl && (
                <a
                  href={event.venue.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#FF9A45] hover:underline pt-1"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </GlassCard>

          {/* About Event Description */}
          <GlassCard className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">About This Experience</h3>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{event.description}</p>
            {event.termsAndConditions && (
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Terms & Entry Policy</h4>
                <p className="text-xs text-white/50 leading-relaxed">{event.termsAndConditions}</p>
              </div>
            )}
          </GlassCard>

          {/* Photo Gallery if available */}
          {event.galleryUrls && event.galleryUrls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white tracking-tight">Experience Gallery</h3>
              <div className="grid grid-cols-2 gap-4">
                {event.galleryUrls.map((url, i) => (
                  <div key={i} className="h-44 rounded-xl overflow-hidden border border-white/[0.08]">
                    <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Ticket Selector & Guest Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleReserveBooking} className="space-y-6">
            {/* Ticket Categories Card */}
            <GlassCard className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF9A45]" />
                  <span>Select Tickets</span>
                </h3>
                <span className="text-xs text-white/40">Step 1 of 2</span>
              </div>

              {tiers.length === 0 ? (
                <p className="text-xs text-white/50 py-4 text-center">No ticket tiers currently active.</p>
              ) : (
                <div className="space-y-3">
                  {tiers.map((tier) => {
                    const isSoldOut = tier.status === 'SOLD_OUT' || tier.soldCount >= tier.capacity;
                    const qty = quantities[tier.id] || 0;
                    const available = Math.max(0, tier.capacity - tier.soldCount - tier.reservedCount);

                    return (
                      <div
                        key={tier.id}
                        className={`p-4 rounded-xl border transition-all ${
                          qty > 0
                            ? 'bg-[#FF6A1A]/10 border-[#FF6A1A]/40'
                            : 'bg-white/[0.02] border-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white">{tier.name}</h4>
                            {tier.description && (
                              <p className="text-xs text-white/50 line-clamp-1">{tier.description}</p>
                            )}
                            <div className="text-sm font-semibold text-[#FF9A45] pt-1">
                              {formatINR(tier.priceInPence)}
                            </div>
                          </div>

                          {/* Counter */}
                          {isSoldOut ? (
                            <GlassBadge variant="error" size="sm">
                              Sold Out
                            </GlassBadge>
                          ) : (
                            <div className="flex items-center gap-2.5 bg-white/[0.05] p-1 rounded-lg border border-white/[0.08]">
                              <button
                                type="button"
                                onClick={() => updateQuantity(tier.id, -1, 0, tier.maxPerBooking)}
                                disabled={qty === 0}
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-30 disabled:pointer-events-none text-white text-xs"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-semibold text-white w-4 text-center">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(tier.id, 1, 0, Math.min(tier.maxPerBooking, available))}
                                disabled={qty >= tier.maxPerBooking || qty >= available}
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-30 disabled:pointer-events-none text-white text-xs"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Perks */}
                        {tier.perks && tier.perks.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex flex-wrap gap-2">
                            {tier.perks.map((perk, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-white/60">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>{perk}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Guest Checkout Card */}
            <GlassCard className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Guest Checkout</span>
                </h3>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
                  No Sign-Up Required
                </span>
              </div>

              <div className="space-y-3">
                <GlassInput
                  label="Full Name (for tickets)"
                  placeholder="e.g. Alex Sharma"
                  value={customer.fullName}
                  onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                  required
                />
                <GlassInput
                  label="Email Address (ticket delivery)"
                  type="email"
                  placeholder="alex@example.com"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  required
                />
                <GlassInput
                  label="Phone / WhatsApp Number"
                  type="tel"
                  placeholder="9876543210"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  required
                />

                <label className="flex items-center gap-2.5 cursor-pointer pt-1 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={customer.whatsappOptIn}
                    onChange={(e) => setCustomer({ ...customer, whatsappOptIn: e.target.checked })}
                    className="rounded bg-white/10 border-white/20 text-[#FF6A1A] focus:ring-0"
                  />
                  <span>Send digital ticket & gate updates via WhatsApp</span>
                </label>
              </div>

              {/* Price Breakdown */}
              <div className="pt-4 border-t border-white/[0.08] space-y-2 text-xs text-white/60">
                <div className="flex justify-between">
                  <span>Tickets Subtotal ({totalTickets} ticket{totalTickets === 1 ? '' : 's'})</span>
                  <span className="text-white font-medium">{formatINR(subtotalInPence)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee (2.5%)</span>
                  <span className="text-white font-medium">{formatINR(serviceFeeInPence)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/[0.06] text-sm font-bold text-white">
                  <span>Total Amount</span>
                  <span className="text-[#FF9A45]">{formatINR(totalAmountInPence)}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
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
                Reserve & Proceed to Payment
              </GlassButton>
            </GlassCard>
          </form>
        </div>
      </div>
    </div>
  );
}
