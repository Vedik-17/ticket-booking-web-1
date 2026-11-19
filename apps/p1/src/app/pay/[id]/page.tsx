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
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Booking, Event } from '@firefly/shared-types';
import { formatINR, paiseToRupees, buildWhatsAppLink } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';
import { buildUpiUri, buildAppUpiUri, generateUpiQrDataUrl } from '@/lib/upi';

export default function P1UpiPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Effective UPI destination (Event-specific override with fallback to system default)
  const effectiveUpiId = event?.upiId?.trim() || p1Storage.defaultUpiId;
  const effectivePayeeName = event?.upiPayeeName?.trim() || event?.title || p1Storage.defaultPayeeName || 'Event Organiser';
  const adminWhatsAppPhone = event?.whatsappPhone?.trim() || p1Storage.defaultAdminPhone;

  useEffect(() => {
    if (bookingId) {
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

        const targetUpiId = e?.upiId?.trim() || p1Storage.defaultUpiId;
        const targetPayee = e?.upiPayeeName?.trim() || e?.title || p1Storage.defaultPayeeName || 'Event Organiser';

        // Generate dynamic exact-amount UPI QR targeting this event's UPI ID if available
        if (targetUpiId) {
          const amountInRupees = paiseToRupees(b.totalAmountInPence);
          const uri = buildUpiUri({
            upiId: targetUpiId,
            payeeName: targetPayee,
            amountInRupees,
            transactionNote: `Firefly ${b.bookingReference}`,
            transactionRef: b.bookingReference,
          });

          generateUpiQrDataUrl(uri).then(setQrDataUrl);
        }
      }
    }
  }, [bookingId, router]);

  // Polling local store to auto-redirect as soon as admin confirms payment
  useEffect(() => {
    if (!booking) return;
    const interval = setInterval(() => {
      const updated = p1Storage.getBooking(booking.id);
      if (updated && updated.status === 'CONFIRMED') {
        const t = p1Storage.getTicketsByBookingId(updated.id);
        if (t.length > 0) {
          router.push(`/ticket/${t[0].id}`);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [booking, router]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(effectiveUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!booking) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
        <Link href="/">
          <GlassButton variant="secondary">Back to Events</GlassButton>
        </Link>
      </div>
    );
  }

  const amountInRupees = paiseToRupees(booking.totalAmountInPence);
  const upiDetails = {
    upiId: effectiveUpiId,
    payeeName: effectivePayeeName,
    amountInRupees,
    transactionNote: `Firefly ${booking.bookingReference}`,
    transactionRef: booking.bookingReference,
  };

  // Universal UPI Scheme (Triggers Android/iOS System App Drawer with ALL UPI apps)
  const genericUpiUri = buildUpiUri(upiDetails);
  const gpayUri = buildAppUpiUri('gpay', upiDetails);
  const phonePeUri = buildAppUpiUri('phonepe', upiDetails);
  const paytmUri = buildAppUpiUri('paytm', upiDetails);
  const credUri = buildAppUpiUri('cred', upiDetails);

  // Preloaded WhatsApp Message specifying tickets, customer name, and mobile number
  const ticketsSummary = booking.items.map((i) => `${i.quantity}x ${i.tierName}`).join(', ');
  const preloadedWhatsAppText =
    `Hello ${effectivePayeeName},\n\nI have initiated payment for my booking:\n` +
    `• Booking Ref: ${booking.bookingReference}\n` +
    `• Customer Name: ${booking.customer.fullName}\n` +
    `• Mobile Number: ${booking.customer.phone}\n` +
    `• Event: ${event?.title || 'Event'}\n` +
    `• Destination UPI ID: ${effectiveUpiId || 'Contact Organiser'}\n` +
    `• Tickets: ${ticketsSummary}\n` +
    `• Total Amount: ${formatINR(booking.totalAmountInPence)}\n\n` +
    `Here is my UPI payment confirmation screenshot for manual verification.`;

  const waRedirectUrl = adminWhatsAppPhone.replace(/\D/g, '').length >= 10
    ? buildWhatsAppLink(adminWhatsAppPhone, preloadedWhatsAppText)
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(preloadedWhatsAppText)}`;

  const handlePayInAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Attempt location redirect as well to guarantee intent trigger across mobile browsers
    try {
      window.location.href = genericUpiUri;
    } catch {
      // Fallback relies on anchor default href
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header Card: Order Summary & Amount */}
      <GlassCard className="text-center space-y-4">
        <div className="space-y-1.5">
          <GlassBadge variant="accent">Direct UPI Payment</GlassBadge>
          <h2 className="text-3xl font-extrabold text-white font-mono tracking-tight">
            {formatINR(booking.totalAmountInPence)}
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs text-white/60">
            <span>Ref:</span>
            <span className="font-mono text-white font-bold px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.12]">
              {booking.bookingReference}
            </span>
          </div>
          {event && (
            <p className="text-xs text-white/70 font-medium truncate max-w-xs mx-auto">
              {event.title}
            </p>
          )}
        </div>

        {/* --- MAIN HERO CTA: PAY IN APP (OPENS APP DRAWER) --- */}
        {effectiveUpiId ? (
          <>
            <div className="pt-2">
              <a
                href={genericUpiUri}
                rel="external"
                target="_top"
                onClick={handlePayInAppClick}
                className="group relative block w-full text-center py-4 px-5 rounded-2xl bg-gradient-to-r from-[#FF6A1A] to-[#FF9A45] text-white font-bold text-base shadow-[0_8px_32px_0_rgba(255,106,26,0.40)] hover:shadow-[0_12px_44px_0_rgba(255,106,26,0.60)] transition-all active:scale-[0.98] border border-white/20"
              >
                <div className="flex items-center justify-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-white animate-bounce" />
                  <span className="text-lg tracking-tight">Pay in App</span>
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1.5 transition-transform" />
                </div>
                <span className="block text-[11px] font-medium text-white/95 mt-1">
                  Tap to open installed UPI apps (PhonePe, GPay, Paytm, Navi, Supermoney, Pop UPI & all)
                </span>
              </a>
            </div>

            {/* Copy UPI ID bar */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-xs">
              <div className="text-left font-mono truncate mr-2">
                <span className="text-[10px] text-white/40 block">
                  Payee: <strong className="text-white font-sans">{effectivePayeeName}</strong>
                </span>
                <span className="text-emerald-400 font-semibold text-xs">{effectiveUpiId}</span>
              </div>
              <button
                onClick={copyUpiId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[#FF9A45] font-medium text-xs transition-colors shrink-0"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy UPI'}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5 text-xs">
            <span className="font-semibold text-amber-400 block">UPI Configuration Pending</span>
            <p className="text-white/70 text-[11px]">
              Organiser has not set a destination UPI ID for this event yet. Please send your booking details on WhatsApp below to arrange payment.
            </p>
          </div>
        )}
      </GlassCard>

      {/* Quick Launch Buttons for Popular Apps (Only if UPI ID configured) */}
      {effectiveUpiId && (
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Quick Launch by App
            </h3>
            <span className="text-[10px] text-white/40">Direct Intent</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <a
              href={gpayUri}
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-center font-medium text-white transition-all hover:border-[#FF6A1A]/40"
            >
              Google Pay
            </a>
            <a
              href={phonePeUri}
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-center font-medium text-white transition-all hover:border-[#FF6A1A]/40"
            >
              PhonePe
            </a>
            <a
              href={paytmUri}
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-center font-medium text-white transition-all hover:border-[#FF6A1A]/40"
            >
              Paytm
            </a>
            <a
              href={credUri}
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] text-center font-medium text-white transition-all hover:border-[#FF6A1A]/40"
            >
              CRED
            </a>
          </div>
        </GlassCard>
      )}

      {/* QR Code Section (Only if UPI ID configured) */}
      {effectiveUpiId && (
        <GlassCard className="space-y-3 text-center">
          <button
            onClick={() => setShowQr(!showQr)}
            className="w-full flex items-center justify-between py-1 text-xs font-medium text-white/70 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#FF9A45]" />
              <span>{showQr ? 'Hide UPI QR Code' : 'Show UPI QR Code (To scan from another device)'}</span>
            </span>
            {showQr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showQr && (
            <div className="pt-2 space-y-3">
              <div className="p-4 rounded-2xl bg-white shadow-xl inline-block mx-auto">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="UPI QR Code" className="w-52 h-52 object-contain" />
                ) : (
                  <div className="w-52 h-52 bg-neutral-200 animate-pulse" />
                )}
              </div>
              <p className="text-[11px] text-white/50">
                Scan with any UPI app scanner (Navi, Pop, Supermoney, GPay, PhonePe, Paytm, BHIM)
              </p>
            </div>
          )}
        </GlassCard>
      )}

      {/* WhatsApp Confirmation Dispatch */}
      <GlassCard className="space-y-3">
        <div className="flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-white">Step 2: Send Payment Proof on WhatsApp</p>
            <p className="text-white/60">
              After paying in your UPI app, send the payment screenshot on WhatsApp. The organiser will verify your payment and issue your QR entrance pass.
            </p>
            {adminWhatsAppPhone && (
              <p className="text-[11px] text-emerald-400 font-mono pt-0.5">
                Organiser Chat: <strong>{adminWhatsAppPhone}</strong>
              </p>
            )}
          </div>
        </div>

        <a href={waRedirectUrl} target="_blank" rel="noopener noreferrer" className="block">
          <GlassButton variant="primary" fullWidth size="md">
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4 text-white" />
              <span>
                {adminWhatsAppPhone
                  ? `Send Details to Organiser (${adminWhatsAppPhone})`
                  : 'Send Details on WhatsApp'}
              </span>
            </div>
          </GlassButton>
        </a>
      </GlassCard>

      {/* Auto-confirmation polling notice */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-center space-y-1 text-xs">
        <p className="text-white/60 flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#FF9A45] animate-spin" />
          <span>Listening for organiser confirmation...</span>
        </p>
        <p className="text-[10px] text-white/40">
          This page will automatically redirect to your Digital Ticket Pass as soon as approved.
        </p>
      </div>
    </div>
  );
}
