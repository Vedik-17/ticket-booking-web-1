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
  ArrowLeft,
  Share2,
  Heart,
  Info,
  Users,
  Sparkles,
  Ticket as TicketIcon,
} from 'lucide-react';
import { GlassButton } from '@firefly/ui';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR, buildWhatsAppLink } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';

export default function ReservaEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idOrSlug = params?.id as string;

  const [event, setEvent] = useState<Event | null>(() => (idOrSlug ? p1Storage.getEvent(idOrSlug) || null : null));
  const [tiers, setTiers] = useState<TicketTier[]>(() => {
    if (idOrSlug) {
      const evt = p1Storage.getEvent(idOrSlug);
      return evt ? p1Storage.getTiers(evt.id) : [];
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(() => !p1Storage.getEvent(idOrSlug));
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({
    fullName: '',
    phone: '',
  });
  const [activeTab, setActiveTab] = useState<'about' | 'venue' | 'lineup'>('about');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = localStorage.getItem('reserva_user_profile');
        if (savedProfile) {
          const u = JSON.parse(savedProfile);
          setCustomer({
            fullName: u.name || '',
            phone: u.phone || '',
          });
        }
      } catch {}
    }

    if (!idOrSlug) return;

    const loadEventData = () => {
      const evt = p1Storage.getEvent(idOrSlug);
      if (evt) {
        setEvent(evt);
        const t = p1Storage.getTiers(evt.id);
        setTiers(t);
        setQuantities((prev) => {
          if (Object.keys(prev).length === 0 && t.length > 0) {
            return { [t[0].id]: 1 };
          }
          return prev;
        });

        // Check if saved
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('reserva_saved_events');
            if (saved) {
              const list: string[] = JSON.parse(saved);
              setIsSaved(list.includes(evt.id));
            }
          } catch {}
        }

        setIsLoading(false);
      }
    };

    loadEventData();
    const unsubscribe = p1Storage.subscribe(loadEventData);
    p1Storage.syncWithServer().finally(() => {
      loadEventData();
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [idOrSlug]);

  const toggleSave = () => {
    if (!event || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('reserva_saved_events');
      let list: string[] = saved ? JSON.parse(saved) : [];
      if (list.includes(event.id)) {
        list = list.filter((id) => id !== event.id);
        setIsSaved(false);
      } else {
        list.push(event.id);
        setIsSaved(true);
      }
      localStorage.setItem('reserva_saved_events', JSON.stringify(list));
    } catch {}
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      if (navigator.share && event) {
        navigator.share({
          title: event.title,
          text: `Check out ${event.title} on Reserva!`,
          url: window.location.href,
        }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(window.location.href);
        alert('Event link copied to clipboard!');
      }
    }
  };

  const updateQty = (tierId: string, delta: number, maxTier: number) => {
    const cur = quantities[tierId] || 0;
    setError(null);
    const next = Math.max(0, Math.min(maxTier, cur + delta));
    setQuantities((prev) => ({ ...prev, [tierId]: next }));
  };

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);
  let totalAmountInPence = 0;
  tiers.forEach((t) => {
    totalAmountInPence += t.priceInPence * (quantities[t.id] || 0);
  });

  const handleProceedToCheckout = () => {
    if (totalTickets === 0) {
      setError('Please select at least 1 ticket to book.');
      return;
    }
    setError(null);
    setShowCheckoutForm(true);
    // Smooth scroll down to checkout form on mobile
    setTimeout(() => {
      document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (totalTickets === 0) {
      setError('Please select at least 1 ticket.');
      return;
    }
    if (!customer.fullName.trim()) {
      setError('Please enter attendee full name.');
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Save profile for future fast checkouts
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'reserva_user_profile',
          JSON.stringify({
            name: customer.fullName.trim(),
            phone: cleanPhone,
            email: `${cleanPhone}@reserva.direct`,
          })
        );
      } catch {}
    }

    const itemsToBook = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([tierId, qty]) => ({ tierId, quantity: qty }));

    const result = p1Storage.createBooking({
      eventId: event.id,
      customer: {
        fullName: customer.fullName.trim(),
        phone: cleanPhone,
      },
      items: itemsToBook,
    });

    if (!result.success || !result.booking) {
      setError(result.error || 'Failed to initialize booking.');
      setSubmitting(false);
      return;
    }

    // Direct redirect to payment page
    router.push(`/pay/${result.booking.id}`);
  };

  if (isLoading && !event) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#6B1736] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8E8E93]">Loading event experience...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-20 text-center space-y-4 bg-white rounded-3xl p-8 border border-[#F0E6E8] shadow-sm">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Event Not Found</h2>
        <p className="text-xs text-[#666666]">
          The event you are looking for might have ended or is no longer listed.
        </p>
        <Link href="/">
          <GlassButton variant="primary">Browse Events</GlassButton>
        </Link>
      </div>
    );
  }

  const startDateFormatted = new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTimeFormatted = new Date(event.schedule.startsAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#6B1736] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-white border border-[#F0E6E8] text-[#4A4A4A] hover:bg-[#FFF5F7] transition-colors"
            title="Share Event"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleSave}
            className="p-2 rounded-full bg-white border border-[#F0E6E8] text-[#4A4A4A] hover:bg-[#FFF5F7] transition-colors"
            title={isSaved ? 'Saved' : 'Save'}
          >
            <Heart
              className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#666666]'}`}
            />
          </button>
        </div>
      </div>

      {/* Hero Banner (Screen 6 reference) */}
      <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 shadow-md border border-[#F0E6E8] bg-neutral-900">
        <img
          src={event.posterUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#6B1736] text-white text-xs font-bold shadow-md">
            {event.category.replace('_', ' ')}
          </span>
          {event.featured && (
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium">
              Featured
            </span>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            {event.title}
          </h1>
          <p className="text-xs sm:text-sm text-white/80 mt-1 line-clamp-1">
            {event.tagline || event.description}
          </p>
        </div>
      </div>

      {/* Event Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#F0E6E8] shadow-sm">
          <div className="p-2.5 rounded-xl bg-[#FDF2F4] text-[#6B1736]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] tracking-wider block">
              Date & Time
            </span>
            <span className="text-xs font-bold text-[#1A1A1A] block">
              {startDateFormatted}
            </span>
            <span className="text-xs text-[#666666]">{startTimeFormatted} onwards</span>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#F0E6E8] shadow-sm">
          <div className="p-2.5 rounded-xl bg-[#FDF2F4] text-[#6B1736]">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] tracking-wider block">
              Venue Location
            </span>
            <span className="text-xs font-bold text-[#1A1A1A] block">
              {event.venue.name}
            </span>
            <span className="text-xs text-[#666666] truncate block max-w-xs">
              {event.venue.address}, {event.venue.city}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs (About / Venue / Lineup) (Screen 6 reference) */}
      <div className="bg-white rounded-3xl p-6 border border-[#F0E6E8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#F0E6E8] pb-3">
          {(['about', 'venue', 'lineup'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-[#6B1736] text-white shadow-sm'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#FFF5F7]'
              }`}
            >
              {tab === 'about' ? 'About Event' : tab === 'venue' ? 'Venue Details' : 'Lineup & Info'}
            </button>
          ))}
        </div>

        {activeTab === 'about' && (
          <div className="space-y-3 text-xs sm:text-sm text-[#4A4A4A] leading-relaxed">
            <p className="whitespace-pre-line">{event.description}</p>
            <div className="pt-3 flex flex-wrap gap-4 text-xs text-[#666666] border-t border-[#F0E6E8]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Verified Event</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TicketIcon className="w-4 h-4 text-[#6B1736]" />
                <span>Instant Digital QR Ticket</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'venue' && (
          <div className="space-y-3 text-xs sm:text-sm text-[#4A4A4A]">
            <h4 className="font-bold text-[#1A1A1A]">{event.venue.name}</h4>
            <p>{event.venue.address}</p>
            <p>
              {event.venue.city}, {event.venue.state} - {event.venue.postalCode}
            </p>
            {event.venue.googleMapsUrl && (
              <a
                href={event.venue.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B1736] hover:underline pt-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {activeTab === 'lineup' && (
          <div className="space-y-3 text-xs sm:text-sm text-[#4A4A4A]">
            <p>Featuring international & national headliners, stage lasers, food courts and experiential zones.</p>
            <div className="p-3.5 rounded-2xl bg-[#FFF5F7] border border-[#FCE7EC] space-y-1">
              <span className="font-bold text-[#6B1736] block">Important Guidelines</span>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-[#666666]">
                <li>Please have your QR pass ready on WhatsApp or phone screen at the gate.</li>
                <li>Outside food and beverages are not allowed inside the arena.</li>
                <li>Re-entry is not permitted once scanned at entry.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Select Tickets Section (Screen 7 reference) */}
      <section className="bg-white rounded-3xl p-6 border border-[#F0E6E8] shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#1A1A1A]">Select Tickets</h2>
          <p className="text-xs text-[#666666]">
            Choose your preferred ticket category and quantity
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {tiers.map((tier) => {
            const qty = quantities[tier.id] || 0;
            const remaining = tier.capacity - tier.soldCount;
            const isSoldOut = remaining <= 0;
            const maxAllowed = Math.min(tier.maxPerBooking || 6, remaining);

            return (
              <div
                key={tier.id}
                className={`p-4 rounded-2xl border transition-all ${
                  qty > 0
                    ? 'border-[#6B1736] bg-[#FFF5F7]/40 shadow-sm'
                    : 'border-[#F0E6E8] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#1A1A1A]">{tier.name}</h3>
                      {remaining > 0 && remaining <= 20 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {remaining} left!
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-xs text-[#666666] line-clamp-1">{tier.description}</p>
                    )}
                    <div className="text-sm font-extrabold text-[#6B1736]">
                      {formatINR(tier.priceInPence)}
                    </div>
                  </div>

                  {/* Quantity Stepper (- 0 +) */}
                  <div>
                    {isSoldOut ? (
                      <span className="px-3 py-1.5 text-xs font-bold text-[#8E8E93] bg-[#F4EBEE] rounded-xl">
                        Sold Out
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#FBF9FA] border border-[#E5D7DA] rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => updateQty(tier.id, -1, maxAllowed)}
                          disabled={qty <= 0}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#E5D7DA] text-[#1A1A1A] hover:bg-[#FFF5F7] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#1A1A1A]">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(tier.id, 1, maxAllowed)}
                          disabled={qty >= maxAllowed}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#6B1736] text-white hover:bg-[#520F27] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Summary Footer Bar */}
        <div className="pt-4 border-t border-[#F0E6E8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
              Total ({totalTickets} {totalTickets === 1 ? 'Ticket' : 'Tickets'})
            </span>
            <span className="text-lg font-black text-[#1A1A1A]">
              {formatINR(totalAmountInPence)}
            </span>
          </div>

          <GlassButton
            type="button"
            variant="primary"
            size="md"
            onClick={handleProceedToCheckout}
            disabled={totalTickets === 0}
            className="sm:w-auto w-full"
          >
            Continue to Checkout
          </GlassButton>
        </div>
      </section>

      {/* Attendee Details Form (Screen 8 reference) */}
      {showCheckoutForm && (
        <section
          id="checkout-section"
          className="bg-white rounded-3xl p-6 border border-[#F0E6E8] shadow-md space-y-4 animate-in fade-in"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#6B1736] text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-[#1A1A1A]">Attendee Details</h2>
            </div>
            <p className="text-xs text-[#666666] pl-8">
              Digital ticket pass will be delivered to this WhatsApp number
            </p>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-4 pl-0 sm:pl-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#4A4A4A] block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vedik Reddy"
                  value={customer.fullName}
                  onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5D7DA] text-xs text-[#1A1A1A] placeholder-[#8E8E93] focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#4A4A4A] block">
                  WhatsApp Mobile (+91)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5D7DA] text-xs text-[#1A1A1A] placeholder-[#8E8E93] focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/30"
                />
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-[#FCE7EC] space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#6B1736] tracking-wider block">
                Booking Summary
              </span>
              <div className="flex items-center justify-between text-xs text-[#1A1A1A]">
                <span className="font-semibold">{event.title}</span>
                <span className="font-bold">{totalTickets} Ticket(s)</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black text-[#1A1A1A] pt-1 border-t border-[#FCE7EC]">
                <span>Total Payable</span>
                <span className="text-[#6B1736]">{formatINR(totalAmountInPence)}</span>
              </div>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={submitting}
            >
              Proceed to UPI Payment
            </GlassButton>
          </form>
        </section>
      )}
    </div>
  );
}
