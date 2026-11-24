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
  Bookmark,
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
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

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
    setTimeout(() => {
      document.getElementById('checkout-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const scrollToTickets = () => {
    document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' });
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
        <div className="w-10 h-10 border-2 border-[#742F42] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8293A0]">Loading event experience...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="py-20 text-center space-y-4 bg-[#FFFDF9] rounded-3xl p-8 border border-[#E8DCCB] shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-[#171D2B]">Event Not Found</h2>
        <p className="text-xs text-[#5A626A]">
          The event you are looking for might have ended or is no longer listed.
        </p>
        <Link href="/explore">
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

  // Calculate pricing range
  const tierPrices = tiers.filter((t) => t.status === 'ACTIVE').map((t) => t.priceInPence);
  const minPrice = tierPrices.length > 0 ? Math.min(...tierPrices) : 0;
  const maxPrice = tierPrices.length > 0 ? Math.max(...tierPrices) : 0;

  // Gallery photos
  const gallery = [
    event.posterUrl,
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
  ];

  return (
    <div className="space-y-8 pb-20">
      {/* Breadcrumb Navigation Row */}
      <div className="flex items-center justify-between text-xs text-[#5A626A] border-b border-[#E8DCCB] pb-3">
        <div className="flex items-center gap-2">
          <Link href="/explore" className="hover:text-[#742F42] transition-colors flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Events</span>
          </Link>
          <span>›</span>
          <span className="capitalize">{event.category.toLowerCase().replace('_', ' ')}</span>
          <span>›</span>
          <span className="font-bold text-[#171D2B] truncate max-w-[200px]">{event.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-[#FFFDF9] border border-[#E8DCCB] text-[#171D2B] hover:bg-[#F4EBDD] transition-colors"
            title="Share Event"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleSave}
            className="p-2 rounded-full bg-[#FFFDF9] border border-[#E8DCCB] text-[#171D2B] hover:bg-[#F4EBDD] transition-colors"
            title={isSaved ? 'Bookmarked' : 'Bookmark'}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#B64A38] text-[#B64A38]' : 'text-[#171D2B]'}`}
            />
          </button>
        </div>
      </div>

      {/* Hero Showcase: Multi-Thumbnail + Large Display + Right Details matching Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Vertical Thumbnails + Large Hero Photo */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4">
          {/* Thumbnails strip */}
          <div className="flex sm:flex-col gap-2.5 order-2 sm:order-1 overflow-x-auto pb-2 sm:pb-0">
            {gallery.map((photoUrl, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                  selectedPhotoIndex === idx
                    ? 'border-[#742F42] shadow-md scale-[1.02]'
                    : 'border-[#E8DCCB] opacity-70 hover:opacity-100'
                }`}
              >
                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Main Hero Photo */}
          <div className="relative flex-1 rounded-3xl overflow-hidden h-72 sm:h-96 border border-[#E8DCCB] bg-neutral-900 shadow-[0_4px_20px_rgba(23,29,43,0.06)] order-1 sm:order-2">
            <img
              src={gallery[selectedPhotoIndex]}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Bookmark button top right */}
            <button
              onClick={toggleSave}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 hover:bg-white text-[#171D2B] shadow-md backdrop-blur-sm transition-all"
            >
              <Bookmark
                className={`w-4 h-4 ${isSaved ? 'fill-[#B64A38] text-[#B64A38]' : 'text-[#171D2B]'}`}
              />
            </button>
          </div>
        </div>

        {/* Right Side: Event Summary, Dates, Venue, Price, and CTA matching Mockup */}
        <div className="lg:col-span-5 space-y-6 bg-[#FFFDF9] p-6 sm:p-7 rounded-3xl border border-[#E8DCCB] shadow-[0_2px_12px_rgba(23,29,43,0.03)]">
          {/* Category Pill */}
          <div>
            <span className="px-3 py-1 rounded-full bg-[#B64A38]/10 text-[#B64A38] text-xs font-bold uppercase tracking-wider border border-[#B64A38]/20">
              {event.category.replace('_', ' ')}
            </span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#171D2B] tracking-tight leading-tight">
            {event.title}
          </h1>

          {/* Date, Time & Venue */}
          <div className="space-y-3 pt-2 border-t border-[#E8DCCB]">
            <div className="flex items-center gap-2.5 text-xs text-[#171D2B]">
              <Calendar className="w-4 h-4 text-[#B64A38]" />
              <span className="font-bold">{startDateFormatted}</span>
              <span className="text-[#8293A0]">•</span>
              <span className="text-[#5A626A]">{startTimeFormatted} onwards</span>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-[#171D2B]">
              <MapPin className="w-4 h-4 text-[#B64A38] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{event.venue.name}</span>
                <span className="text-[#5A626A] block text-[11px]">{event.venue.address}, {event.venue.city}</span>
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="pt-3 border-t border-[#E8DCCB] flex items-baseline justify-between">
            <span className="text-xs uppercase font-bold text-[#8293A0]">Price Range</span>
            <span className="text-xl sm:text-2xl font-serif font-black text-[#171D2B]">
              {minPrice === maxPrice
                ? formatINR(minPrice)
                : `${formatINR(minPrice)} - ${formatINR(maxPrice)}`}
            </span>
          </div>

          {/* Book Tickets CTA Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={scrollToTickets}
              className="flex-1 py-3.5 px-6 rounded-xl bg-[#742F42] hover:bg-[#5E2635] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all text-center"
            >
              Book Tickets
            </button>
            <button
              onClick={toggleSave}
              className="p-3.5 rounded-xl border border-[#E8DCCB] bg-white hover:bg-[#F4EBDD] text-[#171D2B] transition-colors"
              title="Save Event"
            >
              <Heart
                className={`w-4 h-4 ${isSaved ? 'fill-[#B64A38] text-[#B64A38]' : 'text-[#171D2B]'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs (About / Venue / Lineup) */}
      <div className="bg-[#FFFDF9] rounded-3xl p-6 border border-[#E8DCCB] shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E8DCCB] pb-3">
          {(['about', 'venue', 'lineup'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-[#742F42] text-white shadow-sm'
                  : 'text-[#5A626A] hover:text-[#171D2B] hover:bg-[#F4EBDD]'
              }`}
            >
              {tab === 'about' ? 'About Event' : tab === 'venue' ? 'Venue Details' : 'Lineup & Info'}
            </button>
          ))}
        </div>

        {activeTab === 'about' && (
          <div className="space-y-3 text-xs sm:text-sm text-[#5A626A] leading-relaxed">
            <p className="whitespace-pre-line">{event.description}</p>
            <div className="pt-3 flex flex-wrap gap-4 text-xs text-[#5A626A] border-t border-[#E8DCCB]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Verified Event</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TicketIcon className="w-4 h-4 text-[#742F42]" />
                <span>Instant Digital QR Ticket</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'venue' && (
          <div className="space-y-3 text-xs sm:text-sm text-[#5A626A]">
            <h4 className="font-bold text-[#171D2B]">{event.venue.name}</h4>
            <p>{event.venue.address}</p>
            <p>
              {event.venue.city}, {event.venue.state} - {event.venue.postalCode}
            </p>
            {event.venue.googleMapsUrl && (
              <a
                href={event.venue.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#742F42] hover:underline pt-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {activeTab === 'lineup' && (
          <div className="space-y-3 text-xs sm:text-sm text-[#5A626A]">
            <p>Featuring international & national headliners, stage lasers, food courts and experiential zones.</p>
            <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/50 border border-[#E8DCCB] space-y-1">
              <span className="font-bold text-[#742F42] block">Important Guidelines</span>
              <ul className="list-disc pl-4 space-y-0.5 text-xs text-[#5A626A]">
                <li>Please have your QR pass ready on WhatsApp or phone screen at the gate.</li>
                <li>Outside food and beverages are not allowed inside the arena.</li>
                <li>Re-entry is not permitted once scanned at entry.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Select Tickets Section */}
      <section id="tickets-section" className="bg-[#FFFDF9] rounded-3xl p-6 border border-[#E8DCCB] shadow-sm space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#171D2B]">Select Tickets</h2>
          <p className="text-xs text-[#5A626A]">
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
                    ? 'border-[#742F42] bg-[#F4EBDD]/30 shadow-sm'
                    : 'border-[#E8DCCB] bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#171D2B]">{tier.name}</h3>
                      {remaining > 0 && remaining <= 20 && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {remaining} left!
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-xs text-[#5A626A] line-clamp-1">{tier.description}</p>
                    )}
                    <div className="text-sm font-extrabold text-[#742F42]">
                      {formatINR(tier.priceInPence)}
                    </div>
                  </div>

                  {/* Quantity Stepper (- 0 +) */}
                  <div>
                    {isSoldOut ? (
                      <span className="px-3 py-1.5 text-xs font-bold text-[#8293A0] bg-[#F4EBDD] rounded-xl">
                        Sold Out
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#FFFDF9] border border-[#E8DCCB] rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => updateQty(tier.id, -1, maxAllowed)}
                          disabled={qty <= 0}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#E8DCCB] text-[#171D2B] hover:bg-[#F4EBDD] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#171D2B]">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(tier.id, 1, maxAllowed)}
                          disabled={qty >= maxAllowed}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#742F42] text-white hover:bg-[#5E2635] disabled:opacity-30 disabled:pointer-events-none transition-colors"
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
        <div className="pt-4 border-t border-[#E8DCCB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#8293A0] block">
              Total ({totalTickets} {totalTickets === 1 ? 'Ticket' : 'Tickets'})
            </span>
            <span className="text-lg font-black text-[#171D2B]">
              {formatINR(totalAmountInPence)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={totalTickets === 0}
            className="py-3 px-6 rounded-xl bg-[#742F42] hover:bg-[#5E2635] text-white text-xs font-bold shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all sm:w-auto w-full"
          >
            Continue to Checkout
          </button>
        </div>
      </section>

      {/* Attendee Details Form (Screen 8 reference) */}
      {showCheckoutForm && (
        <section
          id="checkout-section"
          className="bg-[#FFFDF9] rounded-3xl p-6 border border-[#E8DCCB] shadow-md space-y-4 animate-in fade-in"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#742F42] text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="font-serif text-lg font-bold text-[#171D2B]">Attendee Details</h2>
            </div>
            <p className="text-xs text-[#5A626A] pl-8">
              Digital ticket pass will be delivered to this WhatsApp number
            </p>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-4 pl-0 sm:pl-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[#171D2B] uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vedik Reddy"
                  value={customer.fullName}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#E8DCCB] bg-white text-xs text-[#171D2B] placeholder-[#8293A0] focus:outline-none focus:border-[#742F42]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#171D2B] uppercase tracking-wider block mb-1">
                  WhatsApp Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8293A0]">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={customer.phone}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#E8DCCB] bg-white text-xs text-[#171D2B] placeholder-[#8293A0] focus:outline-none focus:border-[#742F42]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4EBDD]/40 border border-[#E8DCCB] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#171D2B] block">Direct UPI & Fast Passes</span>
                <span className="text-[11px] text-[#5A626A] block">
                  Scan and pay directly to organizer with 0% hidden gateway commission.
                </span>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-[#742F42] hover:bg-[#5E2635] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Booking Pass...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Payment</span>
                  <span>({formatINR(totalAmountInPence)})</span>
                </>
              )}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
