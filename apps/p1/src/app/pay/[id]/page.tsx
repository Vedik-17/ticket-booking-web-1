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
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Booking, Event, Ticket } from '@firefly/shared-types';
import { formatINR, paiseToRupees } from '@firefly/core';
import { p1Storage, P1OrganiserConfig } from '@/lib/idb-storage';
import { buildUpiUri, buildAppUpiUri, generateUpiQrDataUrl } from '@/lib/upi';

export default function P1UpiPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [config, setConfig] = useState<P1OrganiserConfig | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const b = p1Storage.getBooking(bookingId);
    const cfg = p1Storage.getConfig();
    if (b) {
      setBooking(b);
      setConfig(cfg);

      if (b.status === 'CONFIRMED') {
        const t = p1Storage.getTicketsByBookingId(b.id);
        if (t.length > 0) {
          router.push(`/ticket/${t[0].id}`);
          return;
        }
      }

      // Generate UPI QR code
      const amountInRupees = paiseToRupees(b.totalAmountInPence);
      const uri = buildUpiUri({
        upiId: cfg.upiId,
        payeeName: cfg.payeeName,
        amountInRupees,
        transactionNote: `Firefly ${b.bookingReference}`,
      });

      generateUpiQrDataUrl(uri).then(setQrDataUrl);
    }
  }, [bookingId, router]);

  // Periodic poll of local storage to detect organiser verification
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
    if (!config) return;
    navigator.clipboard.writeText(config.upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Instant simulate confirmation for demo / sandbox preview
  const handleSimulateApproval = () => {
    if (!booking) return;
    setVerifying(true);
    const res = p1Storage.confirmBookingAndIssueTickets(booking.id, `UPI-CONFIRMED-${Date.now()}`);
    if (res.success && res.tickets && res.tickets.length > 0) {
      router.push(`/ticket/${res.tickets[0].id}`);
    }
  };

  if (!booking || !config) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
        <Link href="/">
          <GlassButton variant="secondary">Back to Event</GlassButton>
        </Link>
      </div>
    );
  }

  const amountInRupees = paiseToRupees(booking.totalAmountInPence);
  const upiDetails = {
    upiId: config.upiId,
    payeeName: config.payeeName,
    amountInRupees,
    transactionNote: `Firefly ${booking.bookingReference}`,
  };

  const genericUpiUri = buildUpiUri(upiDetails);
  const gpayUri = buildAppUpiUri('gpay', upiDetails);
  const phonePeUri = buildAppUpiUri('phonepe', upiDetails);
  const paytmUri = buildAppUpiUri('paytm', upiDetails);

  // WhatsApp click-to-chat message
  const waMsg = encodeURIComponent(
    `Hello ${config.businessName}, I have initiated a payment of ${formatINR(
      booking.totalAmountInPence
    )} for Booking Ref: ${booking.bookingReference} (${booking.customer.fullName}).\nHere is my UPI confirmation screenshot.`
  );
  const waUrl = `https://wa.me/${config.whatsappPhone.replace(/\D/g, '')}?text=${waMsg}`;

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header card */}
      <GlassCard className="text-center space-y-4">
        <div className="space-y-1">
          <GlassBadge variant="accent">Direct UPI Payment</GlassBadge>
          <h2 className="text-2xl font-bold text-white font-mono">{formatINR(booking.totalAmountInPence)}</h2>
          <p className="text-xs text-white/50">
            Booking Ref: <span className="font-mono text-white font-semibold">{booking.bookingReference}</span>
          </p>
        </div>

        {/* Dynamic Exact-Amount QR Code */}
        <div className="p-4 rounded-2xl bg-white shadow-xl inline-block mx-auto">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="UPI QR Code" className="w-56 h-56 object-contain" />
          ) : (
            <div className="w-56 h-56 bg-neutral-200 animate-pulse" />
          )}
        </div>

        <p className="text-xs text-white/60">
          Scan using any UPI app (Google Pay, PhonePe, Paytm, BHIM, Cred)
        </p>

        {/* Copy UPI ID */}
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-xs">
          <div className="text-left font-mono truncate mr-2">
            <span className="text-[10px] text-white/40 block">Payee UPI ID</span>
            <span className="text-white font-semibold">{config.upiId}</span>
          </div>
          <button
            onClick={copyUpiId}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[#FF9A45] font-medium text-xs transition-colors shrink-0"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </GlassCard>

      {/* Quick Launch Mobile Buttons */}
      <GlassCard className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pay Directly in App</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <a
            href={gpayUri}
            className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-center font-medium text-white transition-colors"
          >
            Google Pay
          </a>
          <a
            href={phonePeUri}
            className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-center font-medium text-white transition-colors"
          >
            PhonePe
          </a>
          <a
            href={paytmUri}
            className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.08] text-center font-medium text-white transition-colors"
          >
            Paytm
          </a>
        </div>
      </GlassCard>

      {/* WhatsApp Verification Action */}
      <GlassCard className="space-y-3">
        <div className="flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-white">Send Screenshot to Organiser</p>
            <p className="text-white/60">
              After transferring, send the transaction screenshot on WhatsApp for instant confirmation.
            </p>
          </div>
        </div>

        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
          <GlassButton variant="secondary" fullWidth size="md">
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Send WhatsApp Screenshot</span>
            </div>
          </GlassButton>
        </a>
      </GlassCard>

      {/* Sandbox Instant Verification Demo Button */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.15] text-center space-y-2">
        <p className="text-[11px] text-white/50">Prototype Testing Shortcut:</p>
        <button
          onClick={handleSimulateApproval}
          disabled={verifying}
          className="text-xs font-semibold text-[#FF9A45] hover:underline flex items-center justify-center gap-1 mx-auto"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simulate Organiser Approval & View Ticket</span>
        </button>
      </div>
    </div>
  );
}
