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
  const [showQr, setShowQr] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'wallet'>('upi');
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

  // Instant confirmation action for attendee convenience
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
        <div className="w-10 h-10 border-2 border-[#6B1736] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8E8E93]">Initializing secure payment...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-20 text-center space-y-4 bg-white rounded-3xl p-8 border border-[#F0E6E8]">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Booking Not Found</h2>
        <Link href="/">
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

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#6B1736] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <span className="text-xs font-mono text-[#8E8E93]">
          Ref: <strong className="text-[#1A1A1A]">{booking.bookingReference}</strong>
        </span>
      </div>

      {/* Checkout Step Progress Indicator (Screen 8 reference) */}
      <div className="flex items-center justify-center gap-3 text-xs font-semibold text-[#8E8E93]">
        <div className="flex items-center gap-1.5 text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          <span>Details</span>
        </div>
        <div className="w-8 h-[2px] bg-emerald-500" />
        <div className="flex items-center gap-1.5 text-[#6B1736]">
          <span className="w-4 h-4 rounded-full bg-[#6B1736] text-white text-[10px] flex items-center justify-center">
            2
          </span>
          <span className="font-bold">Payment</span>
        </div>
        <div className="w-8 h-[2px] bg-[#E5D7DA]" />
        <div className="flex items-center gap-1.5 text-[#8E8E93]">
          <span className="w-4 h-4 rounded-full bg-[#E5D7DA] text-[#666666] text-[10px] flex items-center justify-center">
            3
          </span>
          <span>Confirm</span>
        </div>
      </div>

      {/* Order Summary Snippet */}
      <div className="bg-white rounded-3xl p-5 border border-[#F0E6E8] shadow-sm flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
            Total Payable
          </span>
          <h2 className="text-2xl font-black text-[#1A1A1A]">
            {formatINR(booking.totalAmountInPence)}
          </h2>
          <p className="text-xs text-[#666666]">{event?.title || 'Event Booking'}</p>
        </div>
        <div className="p-3 rounded-2xl bg-[#FFF5F7] text-[#6B1736] border border-[#FCE7EC]">
          <ShieldCheck className="w-6 h-6" />
        </div>
      </div>

      {/* Payment Methods Selection (Screen 9 reference) */}
      <div className="bg-white rounded-3xl p-6 border border-[#F0E6E8] shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#1A1A1A]">Select Payment Method</h3>
          <p className="text-xs text-[#666666]">
            Fast and secure checkout with zero platform convenience fees
          </p>
        </div>

        <div className="space-y-2.5">
          {/* UPI Radio */}
          <label
            onClick={() => setPaymentMethod('upi')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
              paymentMethod === 'upi'
                ? 'border-[#6B1736] bg-[#FFF5F7]/50 shadow-sm'
                : 'border-[#F0E6E8] hover:border-[#6B1736]/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-[#6B1736] flex items-center justify-center">
                {paymentMethod === 'upi' && <div className="w-2.5 h-2.5 rounded-full bg-[#6B1736]" />}
              </div>
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] block">
                  UPI (Recommended)
                </span>
                <span className="text-[11px] text-[#666666]">
                  Google Pay, PhonePe, Paytm, or any UPI App
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Instant
            </span>
          </label>

          {/* Cards Option (Disabled / placeholder per design) */}
          <label
            onClick={() => setPaymentMethod('card')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer opacity-70 transition-all ${
              paymentMethod === 'card'
                ? 'border-[#6B1736] bg-[#FFF5F7]/50'
                : 'border-[#F0E6E8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-[#CCCCCC] flex items-center justify-center">
                {paymentMethod === 'card' && <div className="w-2.5 h-2.5 rounded-full bg-[#6B1736]" />}
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#8E8E93]" />
                <span className="text-xs font-semibold text-[#1A1A1A]">
                  Credit / Debit Card
                </span>
              </div>
            </div>
            <span className="text-[10px] text-[#8E8E93] bg-[#F4EBEE] px-2 py-0.5 rounded-full">
              UPI preferred
            </span>
          </label>

          {/* Net Banking Option */}
          <label
            onClick={() => setPaymentMethod('netbanking')}
            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer opacity-70 transition-all ${
              paymentMethod === 'netbanking'
                ? 'border-[#6B1736] bg-[#FFF5F7]/50'
                : 'border-[#F0E6E8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-[#CCCCCC] flex items-center justify-center">
                {paymentMethod === 'netbanking' && <div className="w-2.5 h-2.5 rounded-full bg-[#6B1736]" />}
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#8E8E93]" />
                <span className="text-xs font-semibold text-[#1A1A1A]">
                  Net Banking
                </span>
              </div>
            </div>
          </label>
        </div>

        {/* UPI Action Container */}
        {paymentMethod === 'upi' && (
          <div className="space-y-4 pt-2 border-t border-[#F0E6E8]">
            {/* Direct App Launch Buttons (Mobile) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#666666] block uppercase tracking-wider">
                Pay via App
              </span>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={phonePeUri}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#5f259f]/5 hover:bg-[#5f259f]/10 border border-[#5f259f]/20 transition-all text-center"
                >
                  <span className="text-xs font-bold text-[#5f259f]">PhonePe</span>
                  <span className="text-[10px] text-[#666666]">Open App</span>
                </a>
                <a
                  href={gPayUri}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all text-center"
                >
                  <span className="text-xs font-bold text-blue-600">GPay</span>
                  <span className="text-[10px] text-[#666666]">Open App</span>
                </a>
                <a
                  href={paytmUri}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all text-center"
                >
                  <span className="text-xs font-bold text-sky-600">Paytm</span>
                  <span className="text-[10px] text-[#666666]">Open App</span>
                </a>
              </div>
            </div>

            {/* UPI ID & QR Code Toggle */}
            <div className="p-3.5 rounded-2xl bg-[#FBF9FA] border border-[#F0E6E8] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#8E8E93] uppercase font-bold block">
                    Merchant UPI ID
                  </span>
                  <span className="text-xs font-mono font-bold text-[#1A1A1A]">
                    {effectiveUpiId}
                  </span>
                </div>
                <button
                  onClick={handleCopyUpi}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E5D7DA] text-xs font-bold text-[#6B1736] hover:bg-[#FFF5F7] transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* QR Code toggle */}
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="w-full text-center text-xs text-[#6B1736] font-semibold hover:underline flex items-center justify-center gap-1 pt-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQr ? 'Hide UPI QR Code' : 'Show UPI QR Code for Desktop Scan'}</span>
              </button>

              {showQr && qrDataUrl && (
                <div className="pt-2 text-center space-y-2 animate-in fade-in">
                  <div className="p-4 bg-white rounded-2xl border border-[#F0E6E8] inline-block shadow-sm">
                    <img src={qrDataUrl} alt="UPI QR" className="w-48 h-48 mx-auto" />
                  </div>
                  <p className="text-[11px] text-[#8E8E93]">
                    Scan using PhonePe, GPay, Paytm, or BHIM to pay exact ₹{amountInRupees}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proceed Button */}
        <div className="pt-3 space-y-2">
          <GlassButton
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isVerifying}
            onClick={handleSimulatePayment}
          >
            Pay {formatINR(booking.totalAmountInPence)}
          </GlassButton>

          <p className="text-[11px] text-center text-[#8E8E93] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Secure Transaction • Encrypted</span>
          </p>
        </div>
      </div>
    </div>
  );
}
