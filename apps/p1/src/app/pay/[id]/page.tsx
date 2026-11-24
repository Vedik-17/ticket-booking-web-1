'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  QrCode,
  Copy,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Clock,
  ArrowRight,
  Sparkles,
  Zap,
  Smartphone,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building,
  Wallet,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Booking, Event } from '@firefly/shared-types';
import { formatINR, paiseToRupees, buildWhatsAppLink } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';
import { buildUpiUri, buildAppUpiUri, generateUpiQrDataUrl } from '@/lib/upi';

export default function ReservaUpiPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(() =>
    bookingId ? p1Storage.getBooking(bookingId) || null : null
  );
  const [event, setEvent] = useState<Event | null>(() => {
    if (bookingId) {
      const b = p1Storage.getBooking(bookingId);
      return b ? p1Storage.getEvent(b.eventId) || null : null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => !p1Storage.getBooking(bookingId));
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isVerifying, setIsVerifying] = useState(false);

  const effectiveUpiId = event?.upiId?.trim() || p1Storage.defaultUpiId || 'reserva@okhdfcbank';
  const effectivePayeeName =
    event?.upiPayeeName?.trim() || event?.title || p1Storage.defaultPayeeName || 'Reserva Events';

  useEffect(() => {
    if (!bookingId) return;

    const loadData = () => {
      const b = p1Storage.getBooking(bookingId);
      if (b) {
        setBooking(b);
        const e = p1Storage.getEvent(b.eventId);
        if (e) setEvent(e);

        if (b.status === 'CONFIRMED') {
          const t = p1Storage.getTicketsByBookingId(b.id);
          if (t.length > 0) {
            router.push(`/ticket/${t[0].id}`);
            return;
          }
        }

        const targetUpiId = e?.upiId?.trim() || p1Storage.defaultUpiId || 'reserva@okhdfcbank';
        const targetPayee = e?.upiPayeeName?.trim() || e?.title || 'Reserva Events';

        if (targetUpiId) {
          const amountInRupees = paiseToRupees(b.totalAmountInPence);
          const uri = buildUpiUri({
            upiId: targetUpiId,
            payeeName: targetPayee,
            amountInRupees,
            transactionNote: `Reserva ${b.bookingReference}`,
            transactionRef: b.bookingReference,
          });

          generateUpiQrDataUrl(uri).then(setQrDataUrl);
        }
        setIsLoading(false);
      }
    };

    loadData();
    const unsubscribe = p1Storage.subscribe(loadData);
    p1Storage.syncWithServer().finally(() => {
      loadData();
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId, router]);

  // Polling to detect organizer approval
  useEffect(() => {
    if (!booking) return;

    const interval = setInterval(() => {
      const live = p1Storage.getBooking(booking.id);
      if (live && live.status === 'CONFIRMED') {
        const t = p1Storage.getTicketsByBookingId(live.id);
        if (t.length > 0) {
          router.push(`/ticket/${t[0].id}`);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [booking, router]);

  const handleCopyUpi = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(effectiveUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSimulatePayment = async () => {
    if (!booking) return;
    setIsVerifying(true);

    await p1Storage.confirmBookingAndGenerateTickets(booking.id);
    const tickets = p1Storage.getTicketsByBookingId(booking.id);
    if (tickets.length > 0) {
      router.push(`/ticket/${tickets[0].id}`);
    } else {
      router.push('/my-tickets');
    }
  };

  if (isLoading && !booking) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#742F42] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8293A0]">Initializing booking review...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-20 text-center space-y-4 bg-[#FFFDF9] rounded-3xl p-8 border border-[#E8DCCB]">
        <h2 className="font-serif text-xl font-bold text-[#171D2B]">Booking Not Found</h2>
        <Link href="/explore">
          <GlassButton variant="primary">Browse Events</GlassButton>
        </Link>
      </div>
    );
  }

  const amountInRupees = paiseToRupees(booking.totalAmountInPence);
  const upiIntentUri = buildUpiUri({
    upiId: effectiveUpiId,
    payeeName: effectivePayeeName,
    amountInRupees,
    transactionNote: `Reserva ${booking.bookingReference}`,
    transactionRef: booking.bookingReference,
  });

  const phonePeUri = buildAppUpiUri('phonepe', {
    upiId: effectiveUpiId,
    payeeName: effectivePayeeName,
    amountInRupees,
    transactionNote: `Reserva ${booking.bookingReference}`,
    transactionRef: booking.bookingReference,
  });

  const gPayUri = buildAppUpiUri('gpay', {
    upiId: effectiveUpiId,
    payeeName: effectivePayeeName,
    amountInRupees,
    transactionNote: `Reserva ${booking.bookingReference}`,
    transactionRef: booking.bookingReference,
  });

  const paytmUri = buildAppUpiUri('paytm', {
    upiId: effectiveUpiId,
    payeeName: effectivePayeeName,
    amountInRupees,
    transactionNote: `Reserva ${booking.bookingReference}`,
    transactionRef: booking.bookingReference,
  });

  const totalTicketQty = booking.items.reduce((acc, item) => acc + item.quantity, 0);
  const ticketBasePaise = booking.totalAmountInPence;
  const convenienceFeePaise = 15000; // ₹150 convenience fee as seen in Mockup
  const finalTotalPaise = ticketBasePaise + convenienceFeePaise;

  const eventDateFormatted = event
    ? new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const eventTimeFormatted = event
    ? new Date(event.schedule.startsAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#E8DCCB] pb-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A626A] hover:text-[#742F42] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Event</span>
        </button>
        <span className="text-xs font-mono text-[#8293A0]">
          Ref: <strong className="text-[#171D2B]">{booking.bookingReference}</strong>
        </span>
      </div>

      {/* Progress Steps Indicator matching Mockup */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-[#8293A0]">
        <div className="flex items-center gap-1.5 text-emerald-700">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">
            ✓
          </span>
          <span className="hidden sm:inline">Select Seats</span>
        </div>
        <div className="w-6 sm:w-10 h-[1.5px] bg-emerald-500" />
        <div className="flex items-center gap-1.5 text-[#742F42]">
          <span className="w-5 h-5 rounded-full bg-[#742F42] text-white text-[11px] font-bold flex items-center justify-center">
            2
          </span>
          <span className="font-bold text-[#171D2B]">Review</span>
        </div>
        <div className="w-6 sm:w-10 h-[1.5px] bg-[#E8DCCB]" />
        <div className="flex items-center gap-1.5 text-[#8293A0]">
          <span className="w-5 h-5 rounded-full bg-[#E8DCCB] text-[#5A626A] text-[11px] font-bold flex items-center justify-center">
            3
          </span>
          <span className="hidden sm:inline">Payment</span>
        </div>
        <div className="w-6 sm:w-10 h-[1.5px] bg-[#E8DCCB]" />
        <div className="flex items-center gap-1.5 text-[#8293A0]">
          <span className="w-5 h-5 rounded-full bg-[#E8DCCB] text-[#5A626A] text-[11px] font-bold flex items-center justify-center">
            4
          </span>
          <span className="hidden sm:inline">Confirmation</span>
        </div>
      </div>

      {/* Booking Summary Box matching Mockup */}
      <div className="bg-[#FFFDF9] rounded-3xl p-6 border border-[#E8DCCB] shadow-[0_2px_12px_rgba(23,29,43,0.03)] space-y-6">
        <h2 className="font-serif text-xl font-bold text-[#171D2B]">Booking Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Event thumbnail + info */}
          <div className="md:col-span-7 flex items-center gap-4">
            {event?.posterUrl && (
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0 border border-[#E8DCCB]">
                <img src={event.posterUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-1">
              <h3 className="font-serif text-base font-bold text-[#171D2B] line-clamp-1">
                {event?.title || 'Event Booking'}
              </h3>
              <p className="text-xs text-[#5A626A]">
                {eventDateFormatted} • {eventTimeFormatted}
              </p>
              <p className="text-xs text-[#8293A0] line-clamp-1">{event?.venue.name}</p>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="md:col-span-5 space-y-2 text-xs border-t md:border-t-0 md:border-l border-[#E8DCCB] pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between text-[#5A626A]">
              <span>Tickets ({totalTicketQty})</span>
              <span className="font-semibold text-[#171D2B]">{formatINR(ticketBasePaise)}</span>
            </div>
            <div className="flex items-center justify-between text-[#5A626A]">
              <span>Convenience Fee</span>
              <span className="font-semibold text-[#171D2B]">{formatINR(convenienceFeePaise)}</span>
            </div>
            <div className="pt-2 border-t border-[#E8DCCB] flex items-center justify-between font-bold text-sm text-[#171D2B]">
              <span>Total</span>
              <span className="text-base text-[#742F42]">{formatINR(finalTotalPaise)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Section matching Mockup */}
      <div className="bg-[#FFFDF9] rounded-3xl p-6 border border-[#E8DCCB] shadow-[0_2px_12px_rgba(23,29,43,0.03)] space-y-6">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#171D2B]">Payment Options</h3>
          <p className="text-xs text-[#5A626A]">
            Direct instant transfer to organizer via UPI or scan dynamic QR
          </p>
        </div>

        {/* Payment Methods Selection */}
        <div className="space-y-3">
          {/* UPI Option */}
          <label
            onClick={() => setPaymentMethod('upi')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
              paymentMethod === 'upi'
                ? 'border-[#742F42] bg-[#F4EBDD]/30 shadow-sm'
                : 'border-[#E8DCCB] hover:border-[#742F42]/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#742F42] flex items-center justify-center">
                {paymentMethod === 'upi' && <div className="w-2.5 h-2.5 rounded-full bg-[#742F42]" />}
              </div>
              <div>
                <span className="text-xs font-bold text-[#171D2B] block">
                  UPI (Recommended)
                </span>
                <span className="text-[11px] text-[#5A626A]">
                  Google Pay, PhonePe, Paytm, or any UPI App
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
              Instant
            </span>
          </label>

          {/* Cards Option */}
          <label
            onClick={() => setPaymentMethod('card')}
            className="flex items-center justify-between p-4 rounded-2xl border border-[#E8DCCB] opacity-70 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-[#D5B77B] flex items-center justify-center" />
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#8293A0]" />
                <span className="text-xs font-semibold text-[#171D2B]">Credit / Debit Card</span>
              </div>
            </div>
            <span className="text-[10px] text-[#8293A0] bg-[#F4EBDD] px-2 py-0.5 rounded-full">
              UPI preferred
            </span>
          </label>
        </div>

        {/* UPI Details & Dynamic QR */}
        {paymentMethod === 'upi' && (
          <div className="space-y-5 pt-3 border-t border-[#E8DCCB]">
            {/* Pay via UPI App Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#5A626A] block uppercase tracking-wider">
                Pay via App
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <a
                  href={phonePeUri}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#5f259f]/5 hover:bg-[#5f259f]/10 border border-[#5f259f]/20 transition-all text-center"
                >
                  <span className="text-xs font-bold text-[#5f259f]">PhonePe</span>
                  <span className="text-[10px] text-[#5A626A]">Open App</span>
                </a>
                <a
                  href={gPayUri}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all text-center"
                >
                  <span className="text-xs font-bold text-blue-700">Google Pay</span>
                  <span className="text-[10px] text-[#5A626A]">Open App</span>
                </a>
                <a
                  href={paytmUri}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all text-center"
                >
                  <span className="text-xs font-bold text-sky-700">Paytm</span>
                  <span className="text-[10px] text-[#5A626A]">Open App</span>
                </a>
              </div>
            </div>

            {/* Dynamic QR Code */}
            {qrDataUrl && (
              <div className="p-5 rounded-2xl bg-white border border-[#E8DCCB] text-center space-y-3">
                <span className="text-xs font-bold text-[#171D2B] block">
                  Or Scan QR Code with Any UPI App
                </span>
                <div className="inline-block p-3 rounded-2xl bg-white border border-[#E8DCCB] shadow-sm">
                  <img src={qrDataUrl} alt="UPI Payment QR" className="w-48 h-48 mx-auto" />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-[#5A626A]">
                  <span>Exact Amount:</span>
                  <strong className="text-[#742F42] text-sm">{formatINR(finalTotalPaise)}</strong>
                </div>
              </div>
            )}

            {/* UPI ID Copy Box */}
            <div className="p-3.5 rounded-2xl bg-[#F4EBDD]/40 border border-[#E8DCCB] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8293A0] uppercase font-bold block">
                  Organizer UPI ID
                </span>
                <span className="text-xs font-mono font-bold text-[#171D2B]">{effectiveUpiId}</span>
              </div>
              <button
                onClick={handleCopyUpi}
                className="px-3 py-1.5 rounded-xl border border-[#E8DCCB] bg-white text-xs font-bold text-[#171D2B] hover:bg-[#F4EBDD] transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Confirmation CTA button */}
        <div className="pt-2">
          <button
            onClick={handleSimulatePayment}
            disabled={isVerifying}
            className="w-full py-4 rounded-xl bg-[#742F42] hover:bg-[#5E2635] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Digital QR Pass...</span>
              </>
            ) : (
              <>
                <span>Proceed to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
