'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Booking, Event, Ticket } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { MockPaymentProvider } from '@firefly/payment-engine';

export default function BookingPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes default in seconds

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        const data = await res.json();
        if (data.success && data.booking) {
          setBooking(data.booking);
          setEvent(data.event);
          setTickets(data.tickets || []);

          if (data.booking.status === 'CONFIRMED' && data.tickets && data.tickets.length > 0) {
            router.push(`/ticket/${data.tickets[0].id}`);
          }

          // Calculate remaining seconds
          const expires = new Date(data.booking.reservationExpiresAt).getTime();
          const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
          setTimeLeft(remaining);
        } else {
          setError(data.error || 'Booking record not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    if (bookingId) {
      loadBooking();
    }
  }, [bookingId, router]);

  // Reservation expiry countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handlePayNow = async () => {
    if (!booking) return;
    setProcessing(true);
    setError(null);

    try {
      // 1. Create Order on server
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const orderData = await orderRes.json();

      if (!orderData.success || !orderData.order) {
        throw new Error(orderData.error || 'Failed to initialize payment order');
      }

      const { orderId, provider } = orderData.order;

      // 2. Complete payment:
      // If Razorpay live gateway is active and configured in window:
      if (provider === 'RAZORPAY' && typeof window !== 'undefined' && (window as any).Razorpay) {
        const options = {
          key: orderData.order.keyId,
          amount: booking.totalAmountInPence,
          currency: booking.currency,
          name: 'FIREFLY Ticketing',
          description: event?.title || 'Event Booking',
          order_id: orderId,
          handler: async (response: any) => {
            await verifyAndComplete(orderId, response.razorpay_payment_id, response.razorpay_signature);
          },
          prefill: {
            name: booking.customer.fullName,
            email: booking.customer.email,
            contact: booking.customer.phone,
          },
          theme: { color: '#FF6A1A' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setProcessing(false);
        return;
      }

      // If in sandbox / mock provider mode (zero external credentials required):
      const testPaymentId = `pay_mock_${Date.now()}`;
      const testSignature = MockPaymentProvider.generateTestSignature(orderId, testPaymentId);
      await verifyAndComplete(orderId, testPaymentId, testSignature);
    } catch (err: any) {
      setError(err.message || 'Payment execution failed');
      setProcessing(false);
    }
  };

  const verifyAndComplete = async (orderId: string, paymentId: string, signature: string) => {
    if (!booking) return;

    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          orderId,
          paymentId,
          signature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success && verifyData.tickets && verifyData.tickets.length > 0) {
        router.push(`/ticket/${verifyData.tickets[0].id}`);
      } else {
        throw new Error(verifyData.error || 'Payment verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'Server verification failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6A1A] border-r-2 border-transparent" />
        <p className="text-sm text-white/50">Retrieving booking summary...</p>
      </div>
    );
  }

  if (!booking || !event) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Booking Not Found</h2>
        <p className="text-white/60">This booking reference does not exist or has expired.</p>
        <Link href="/">
          <GlassButton variant="secondary">Return Home</GlassButton>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Reservation Expiry Banner */}
      <div className="p-4 rounded-2xl bg-[#FF6A1A]/10 border border-[#FF6A1A]/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#FF9A45]" />
          <div>
            <p className="text-xs font-semibold text-white">Temporary Inventory Hold</p>
            <p className="text-[11px] text-white/60">Your tickets are reserved for 10 minutes.</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-white/40 block">Time Left</span>
          <span className="text-lg font-mono font-bold text-[#FF9A45]">{formattedTimer}</span>
        </div>
      </div>

      {/* Main Payment Checkout Card */}
      <GlassCard className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">Booking Reference</span>
            <h2 className="text-xl font-mono font-bold text-white tracking-wider">{booking.bookingReference}</h2>
            <p className="text-xs text-white/60">{event.title}</p>
          </div>
          <GlassBadge variant="accent">Reserved</GlassBadge>
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ticket Summary</h3>
          {booking.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div>
                <span className="font-semibold text-white">{item.tierName}</span>
                <span className="text-xs text-white/40 block">{item.quantity} × {formatINR(item.unitPriceInPence)}</span>
              </div>
              <span className="font-medium text-white">{formatINR(item.totalPriceInPence)}</span>
            </div>
          ))}
        </div>

        {/* Customer Details Recap */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2 text-xs">
          <h4 className="font-semibold text-white/80 uppercase tracking-wider">Attendee Information</h4>
          <div className="grid grid-cols-2 gap-2 text-white/60">
            <div>Name: <span className="text-white font-medium">{booking.customer.fullName}</span></div>
            <div>Email: <span className="text-white font-medium">{booking.customer.email}</span></div>
            <div>Phone: <span className="text-white font-medium">{booking.customer.phone}</span></div>
            <div>WhatsApp Pass: <span className="text-emerald-400 font-medium">Opted-in</span></div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="pt-2 border-t border-white/[0.08] space-y-2 text-xs text-white/60">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-white">{formatINR(booking.subtotalInPence)}</span>
          </div>
          <div className="flex justify-between">
            <span>Convenience & Platform Fee</span>
            <span className="text-white">{formatINR(booking.serviceFeeInPence)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-white/[0.06] text-base font-bold text-white">
            <span>Amount Payable</span>
            <span className="text-[#FF9A45]">{formatINR(booking.totalAmountInPence)}</span>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pay Action Button */}
        <div className="space-y-3 pt-2">
          <GlassButton
            onClick={handlePayNow}
            variant="primary"
            fullWidth
            size="lg"
            isLoading={processing}
            disabled={timeLeft <= 0 || processing}
            className="text-base"
          >
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Complete Payment of {formatINR(booking.totalAmountInPence)}</span>
            </div>
          </GlassButton>

          <p className="text-center text-[11px] text-white/40 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-End Cryptographically Verified Payment & Immediate QR Issuance</span>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

