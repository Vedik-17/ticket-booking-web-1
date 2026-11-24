'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  QrCode,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Download,
  MessageSquare,
  Home,
  Check,
  Wallet,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Ticket, Event, Booking } from '@firefly/shared-types';
import { p1Storage } from '@/lib/idb-storage';
import { buildWhatsAppLink, buildTicketShareMessage } from '@firefly/core';
import { generateTicketCardDataUrl, shareTicketImageDirectly } from '@/lib/image';

export default function ReservaTicketPassPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(() =>
    ticketId ? p1Storage.getTicket(ticketId) || null : null
  );
  const [event, setEvent] = useState<Event | null>(() => {
    if (ticketId) {
      const t = p1Storage.getTicket(ticketId);
      return t ? p1Storage.getEvent(t.eventId) || null : null;
    }
    return null;
  });
  const [booking, setBooking] = useState<Booking | null>(() => {
    if (ticketId) {
      const t = p1Storage.getTicket(ticketId);
      return t ? p1Storage.getBooking(t.bookingId) || null : null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => !p1Storage.getTicket(ticketId));
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!ticketId) return;

    const loadTicketData = () => {
      const t = p1Storage.getTicket(ticketId);
      if (t) {
        setTicket(t);
        const e = p1Storage.getEvent(t.eventId);
        if (e) setEvent(e);
        const b = p1Storage.getBooking(t.bookingId);
        if (b) setBooking(b);

        QRCode.toDataURL(t.qrPayload, {
          width: 320,
          margin: 2,
          color: { dark: '#1A1A1A', light: '#FFFFFF' },
          errorCorrectionLevel: 'H',
        }).then(setQrDataUrl);
        setIsLoading(false);
      }
    };

    loadTicketData();
    const unsubscribe = p1Storage.subscribe(loadTicketData);
    p1Storage.syncWithServer().finally(() => {
      loadTicketData();
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [ticketId]);

  const handleShareWhatsApp = () => {
    if (!ticket || !event) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const message = `🎟️ *Reserva Ticket Pass*\n\nEvent: *${event.title}*\nAttendee: ${ticket.attendeeName}\nTier: ${ticket.tierName}\nBooking Ref: ${booking?.bookingReference || ticket.ticketNumber}\n\nView Your Pass:\n${shareUrl}\n\nPlease have the QR code ready for gate check-in.`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadCard = async () => {
    if (!ticket || !event) return;
    setDownloading(true);
    try {
      const cardUrl = await generateTicketCardDataUrl({
        eventTitle: event.title,
        venueName: `${event.venue.name}, ${event.venue.city}`,
        dateStr: new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        attendeeName: ticket.attendeeName,
        tierName: ticket.tierName,
        ticketNumber: ticket.ticketNumber,
        qrPayload: ticket.qrPayload,
      });

      const a = document.createElement('a');
      a.href = cardUrl;
      a.download = `Reserva-Ticket-${ticket.ticketNumber}.png`;
      a.click();
    } catch (e) {
      console.warn('Card generation fallback:', e);
      alert('Could not download image, please take a screenshot of your QR pass.');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading && !ticket) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-[#6B1736] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8E8E93]">Loading digital ticket pass...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-20 text-center space-y-4 bg-white rounded-3xl p-8 border border-[#F0E6E8] shadow-sm">
        <h2 className="text-xl font-bold text-[#1A1A1A]">Ticket Pass Not Found</h2>
        <p className="text-xs text-[#666666]">
          This ticket may have been moved or the booking reference is expired.
        </p>
        <Link href="/">
          <GlassButton variant="primary">Browse Events</GlassButton>
        </Link>
      </div>
    );
  }

  const startDate = event
    ? new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Upcoming Event';

  const isCheckedIn = ticket.status === 'CHECKED_IN';

  return (
    <div className="max-w-md mx-auto space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#6B1736] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <span className="text-xs font-bold text-[#6B1736] uppercase tracking-wider">
          Digital Pass
        </span>
      </div>

      {/* Confirmation Banner (Screen 10 reference) */}
      <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-1 shadow-sm">
        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h1 className="text-base font-extrabold text-emerald-950">
          Booking Confirmed!
        </h1>
        <p className="text-xs text-emerald-800">
          Your tickets have been issued and are ready for entry.
        </p>
      </div>

      {/* Digital Ticket Card (Screen 12 reference) */}
      <div className="bg-white rounded-3xl overflow-hidden border border-[#F0E6E8] shadow-xl space-y-0">
        {/* Card Header */}
        <div className="p-5 bg-gradient-to-r from-[#4E0F26] to-[#6B1736] text-white space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200">
            Reserva Pass
          </span>
          <h2 className="text-lg font-black tracking-tight">{event?.title || 'Live Experience'}</h2>
          <div className="flex items-center gap-2 text-xs text-white/80 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-rose-300" />
              {startDate}
            </span>
            <span>•</span>
            <span className="truncate">{event?.venue.city}</span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-6 text-center space-y-4 bg-white">
          <div className="relative inline-block p-4 rounded-2xl bg-white border-2 border-[#F0E6E8] shadow-sm">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Ticket QR" className="w-56 h-56 mx-auto rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-neutral-100 rounded-lg">
                <QrCode className="w-12 h-12 text-[#8E8E93] animate-pulse" />
              </div>
            )}

            {isCheckedIn && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-950 mt-1">CHECKED IN</span>
                <span className="text-[10px] text-emerald-700">
                  {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString() : 'Entry Granted'}
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#8E8E93]">
            Present this QR code at the entrance scanner for admission
          </p>

          {/* Ticket Details Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F0E6E8] text-left text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
                Attendee
              </span>
              <span className="font-bold text-[#1A1A1A] truncate block">
                {ticket.attendeeName}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
                Ticket Tier
              </span>
              <span className="font-bold text-[#6B1736] truncate block">
                {ticket.tierName}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
                Booking ID
              </span>
              <span className="font-mono font-bold text-[#1A1A1A] block">
                {booking?.bookingReference || ticket.ticketNumber}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
                Status
              </span>
              <span
                className={`font-bold block ${
                  isCheckedIn ? 'text-emerald-600' : 'text-blue-600'
                }`}
              >
                {isCheckedIn ? 'Checked-In' : 'Valid Entry'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons (WhatsApp Share & Download Card) */}
      <div className="space-y-2.5">
        <button
          onClick={handleShareWhatsApp}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Share Ticket on WhatsApp</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadCard}
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white border border-[#F0E6E8] hover:bg-[#FFF5F7] text-xs font-bold text-[#1A1A1A] transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-[#6B1736]" />
            <span>{downloading ? 'Exporting...' : 'Save Ticket Card'}</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-white border border-[#F0E6E8] hover:bg-[#FFF5F7] text-xs font-bold text-[#1A1A1A] transition-colors shadow-sm"
          >
            <Home className="w-4 h-4 text-[#6B1736]" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
