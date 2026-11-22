'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  QrCode,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Ticket, Event, Booking } from '@firefly/shared-types';
import { buildWhatsAppLink, buildTicketShareMessage } from '@firefly/core';

export default function TicketPassPage() {
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTicket() {
      try {
        const res = await fetch(`/api/tickets/${ticketId}`);
        const data = await res.json();
        if (data.success && data.ticket) {
          setTicket(data.ticket);
          setEvent(data.event);
          setBooking(data.booking);
          setQrDataUrl(data.qrDataUrl);
        } else {
          setError(data.error || 'Ticket not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load ticket.');
      } finally {
        setLoading(false);
      }
    }
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6A1A] border-r-2 border-transparent" />
        <p className="text-sm text-white/50">Minting digital ticket pass...</p>
      </div>
    );
  }

  if (!ticket || !event) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Ticket Not Found</h2>
        <p className="text-white/60">The specified ticket pass could not be retrieved.</p>
        <Link href="/">
          <GlassButton variant="secondary">Go to Events</GlassButton>
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = new Date(event.schedule.startsAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const shareText = buildTicketShareMessage(
    event.title,
    typeof window !== 'undefined' ? window.location.href : '',
    ticket.attendeeName
  );
  const waShareUrl = buildWhatsAppLink(booking?.customer.phone || '', shareText);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Confirmed & Issued</span>
        </span>
      </div>

      {/* Physical-Digital Liquid Glass Ticket Card */}
      <GlassCard padding="none" className="relative border-white/[0.15] shadow-2xl overflow-hidden print:border-black">
        {/* Ticket Header Graphic */}
        <div className="relative h-32 bg-neutral-900 overflow-hidden">
          <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-transparent" />
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
            <span className="text-[10px] tracking-widest font-mono font-bold text-white/80 uppercase">FIREFLY PASS</span>
            <GlassBadge
              variant={ticket.status === 'CHECKED_IN' ? 'warning' : 'accent'}
              size="sm"
            >
              {ticket.status === 'CHECKED_IN' ? 'ADMITTED' : 'VALID FOR ENTRY'}
            </GlassBadge>
          </div>
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-lg font-bold text-white line-clamp-1">{event.title}</h2>
          </div>
        </div>

        {/* Ticket Notch Dividers */}
        <div className="relative flex items-center justify-between px-2 bg-[#141414]">
          <div className="w-4 h-6 bg-[#080808] rounded-r-full -ml-2 border-r border-white/[0.12]" />
          <div className="flex-1 border-t-2 border-dashed border-white/[0.10] mx-2" />
          <div className="w-4 h-6 bg-[#080808] rounded-l-full -mr-2 border-l border-white/[0.12]" />
        </div>

        {/* Ticket Body & QR Code */}
        <div className="p-6 bg-[#141414] space-y-6 text-center">
          {/* QR Code Container */}
          <div className="inline-block p-4 rounded-2xl bg-white shadow-xl shadow-black/50">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Ticket QR" className="w-52 h-52 object-contain" />
            ) : (
              <div className="w-52 h-52 bg-neutral-200 animate-pulse flex items-center justify-center">
                <QrCode className="w-12 h-12 text-neutral-400" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">Ticket Number</span>
            <p className="text-base font-mono font-bold text-white tracking-widest">{ticket.ticketNumber}</p>
          </div>

          {/* Attendee and Tier metadata */}
          <div className="grid grid-cols-2 gap-4 text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Attendee</span>
              <span className="font-semibold text-white truncate block">{ticket.attendeeName}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Access Tier</span>
              <span className="font-semibold text-[#FF9A45] truncate block">{ticket.tierName}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Date & Time</span>
              <span className="font-medium text-white truncate block">{startDate} • {startTime}</span>
            </div>
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Venue</span>
              <span className="font-medium text-white truncate block">{event.venue.name}</span>
            </div>
          </div>

          <p className="text-[11px] text-white/40 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Encrypted QR with HMAC signature. Show this pass at entrance.</span>
          </p>
        </div>
      </GlassCard>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 print:hidden">
        <a href={waShareUrl} target="_blank" rel="noopener noreferrer" className="block">
          <GlassButton variant="secondary" fullWidth size="md">
            <Share2 className="w-4 h-4 mr-2 text-emerald-400" />
            <span>Share Ticket</span>
          </GlassButton>
        </a>
        <GlassButton variant="secondary" fullWidth size="md" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2 text-white/70" />
          <span>Print Pass</span>
        </GlassButton>
      </div>
    </div>
  );
}

