'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Ticket, Event, Booking } from '@firefly/shared-types';
import { p1Storage } from '@/lib/idb-storage';
import { buildWhatsAppLink, buildTicketShareMessage } from '@firefly/core';
import { generateTicketCardDataUrl, shareTicketImageDirectly } from '@/lib/image';

export default function P1TicketPassPage() {
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
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
        color: { dark: '#080808', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      }).then(setQrDataUrl);
    }
  }, [ticketId]);

  if (!ticket || !event) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Ticket Not Found</h2>
        <Link href="/">
          <GlassButton variant="secondary">Back to Event</GlassButton>
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const startTime = new Date(event.schedule.startsAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const ticketUrl = `${origin}/ticket/${ticket.id}`;
  const fullPreloadedWhatsAppText =
    `Hello ${ticket.attendeeName}!\n\n` +
    `Your digital ticket pass for "${event.title}" is confirmed!\n\n` +
    `• Ticket No: ${ticket.ticketNumber}\n` +
    `• Tier: ${ticket.tierName}\n` +
    `• Attendee: ${ticket.attendeeName}\n` +
    `• Date: ${startDate} • ${startTime}\n` +
    `• Venue: ${event.venue.name}, ${event.venue.city}\n\n` +
    `Access your official QR entrance pass here:\n${ticketUrl}\n\n` +
    `Please have this QR code ready for gate scanning at the venue.`;

  const targetPhone = booking?.customer.phone || '';
  const waDirectUrl = targetPhone
    ? buildWhatsAppLink(targetPhone, fullPreloadedWhatsAppText)
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(fullPreloadedWhatsAppText)}`;

  const handleDownloadPhoto = async () => {
    if (!ticket || !event) return;
    const cardUrl = await generateTicketCardDataUrl({
      eventTitle: event.title,
      attendeeName: ticket.attendeeName,
      tierName: ticket.tierName,
      ticketNumber: ticket.ticketNumber,
      venueName: event.venue.name,
      dateStr: startDate,
      qrPayload: ticket.qrPayload,
    });

    const a = document.createElement('a');
    a.href = cardUrl;
    a.download = `Firefly-Pass-${ticket.ticketNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Verified & Confirmed</span>
        </span>
      </div>

      {/* Ticket Pass Card */}
      <GlassCard padding="none" className="relative shadow-2xl overflow-hidden print:border-black">
        <div className="relative h-28 bg-neutral-900 overflow-hidden">
          <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
            <span className="text-[10px] tracking-widest font-mono font-bold text-white/80 uppercase">FIREFLY PASS</span>
            <GlassBadge variant={ticket.status === 'CHECKED_IN' ? 'warning' : 'accent'} size="sm">
              {ticket.status === 'CHECKED_IN' ? 'CHECKED IN' : 'VALID FOR ENTRY'}
            </GlassBadge>
          </div>
          <div className="absolute bottom-2.5 left-4 right-4">
            <h2 className="text-base font-bold text-white truncate">{event.title}</h2>
          </div>
        </div>

        {/* Notch */}
        <div className="relative flex items-center justify-between px-2 bg-[#141414]">
          <div className="w-4 h-6 bg-[#080808] rounded-r-full -ml-2 border-r border-white/[0.12]" />
          <div className="flex-1 border-t-2 border-dashed border-white/[0.10] mx-2" />
          <div className="w-4 h-6 bg-[#080808] rounded-l-full -mr-2 border-l border-white/[0.12]" />
        </div>

        {/* Ticket Details */}
        <div className="p-6 bg-[#141414] space-y-5 text-center">
          <div className="inline-block p-3.5 rounded-2xl bg-white shadow-xl">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Pass QR" className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 bg-neutral-200 animate-pulse" />
            )}
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">Ticket ID</span>
            <p className="text-base font-mono font-bold text-white tracking-widest">{ticket.ticketNumber}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Attendee</span>
              <span className="font-semibold text-white truncate block">{ticket.attendeeName}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Tier</span>
              <span className="font-semibold text-[#FF9A45] truncate block">{ticket.tierName}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Date</span>
              <span className="font-medium text-white truncate block">{startDate} • {startTime}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase block">Venue</span>
              <span className="font-medium text-white truncate block">{event.venue.name}</span>
            </div>
          </div>

          <p className="text-[11px] text-white/40 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Present this QR at entrance for scanner admission</span>
          </p>
        </div>
      </GlassCard>

      {/* Buttons */}
      <div className="space-y-2 print:hidden">
        <a
          href={waDirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <GlassButton
            variant="primary"
            fullWidth
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 py-3.5 shadow-[0_4px_24px_rgba(16,185,129,0.35)] text-white"
          >
            <MessageSquare className="w-4 h-4 mr-2 text-white" />
            <span className="font-bold">Send Ticket on WhatsApp</span>
          </GlassButton>
        </a>

        <div className="grid grid-cols-2 gap-2">
          <GlassButton variant="secondary" fullWidth size="md" onClick={handleDownloadPhoto}>
            <Download className="w-4 h-4 mr-2 text-white/70" />
            <span>Save to Photos</span>
          </GlassButton>
          <GlassButton variant="secondary" fullWidth size="md" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2 text-white/70" />
            <span>Print Pass</span>
          </GlassButton>
        </div>

        {event.whatsappPhone && (
          <div className="text-center pt-2">
            <a
              href={buildWhatsAppLink(
                event.whatsappPhone,
                `Hi, I have a query regarding my ticket ${ticket.ticketNumber} for "${event.title}".`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/50 hover:text-emerald-400 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact Organiser on WhatsApp</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

