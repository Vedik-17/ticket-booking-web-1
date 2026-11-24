'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  ArrowRight,
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Ticket, Event, Booking } from '@firefly/shared-types';
import { p1Storage } from '@/lib/idb-storage';
import { GlassButton } from '@firefly/ui';

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(() => p1Storage.getTickets());
  const [events, setEvents] = useState<Event[]>(() => p1Storage.getEvents());
  const [bookings, setBookings] = useState<Booking[]>(() => p1Storage.getBookings());
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const updateData = () => {
      setTickets(p1Storage.getTickets());
      setEvents(p1Storage.getEvents());
      setBookings(p1Storage.getBookings());
    };

    updateData();
    const unsubscribe = p1Storage.subscribe(updateData);
    p1Storage.syncWithServer().finally(() => updateData());

    return () => unsubscribe();
  }, []);

  const now = new Date().getTime();

  const ticketsWithDetails = tickets.map((t) => {
    const event = events.find((e) => e.id === t.eventId);
    const booking = bookings.find((b) => b.id === t.bookingId);
    const eventDate = event ? new Date(event.schedule.startsAt).getTime() : now;
    const isPast = eventDate < now;
    return { ticket: t, event, booking, isPast };
  });

  const filteredTickets = ticketsWithDetails.filter((item) =>
    activeTab === 'upcoming' ? !item.isPast : item.isPast
  );

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">My Tickets</h1>
        <p className="text-xs text-[#666666]">
          View your issued passes and entrance QR codes
        </p>
      </div>

      {/* Tabs (Upcoming vs Past) (Screen 11 reference) */}
      <div className="flex rounded-2xl bg-white p-1 border border-[#F0E6E8] shadow-sm">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'upcoming'
              ? 'bg-[#6B1736] text-white shadow-sm'
              : 'text-[#666666] hover:text-[#1A1A1A]'
          }`}
        >
          Upcoming ({ticketsWithDetails.filter((t) => !t.isPast).length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'past'
              ? 'bg-[#6B1736] text-white shadow-sm'
              : 'text-[#666666] hover:text-[#1A1A1A]'
          }`}
        >
          Past ({ticketsWithDetails.filter((t) => t.isPast).length})
        </button>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#F0E6E8] space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FDF2F4] text-[#6B1736] mx-auto flex items-center justify-center">
              <TicketIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A]">
              No {activeTab} tickets found
            </h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto">
              {activeTab === 'upcoming'
                ? "You haven't booked any upcoming tickets yet. Discover exciting experiences happening now!"
                : 'No past ticket history recorded yet.'}
            </p>
            {activeTab === 'upcoming' && (
              <Link href="/explore">
                <GlassButton variant="primary" size="md">
                  Explore Events
                </GlassButton>
              </Link>
            )}
          </div>
        ) : (
          filteredTickets.map(({ ticket, event, booking }) => {
            const startDate = event
              ? new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Date TBD';

            return (
              <Link
                key={ticket.id}
                href={`/ticket/${ticket.id}`}
                className="group block bg-white rounded-3xl p-5 border border-[#F0E6E8] shadow-[0_4px_20px_rgba(107,23,54,0.04)] hover:border-[#6B1736]/40 hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FDF2F4] text-[#6B1736] text-[10px] font-bold border border-[#FCE7EC]">
                      {ticket.tierName}
                    </span>
                    <h3 className="text-base font-bold text-[#1A1A1A] group-hover:text-[#6B1736] transition-colors">
                      {event?.title || 'Live Experience'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#666666] pt-1">
                      <span className="flex items-center gap-1 text-[#6B1736] font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        {startDate}
                      </span>
                      <span>•</span>
                      <span className="truncate">{event?.venue.city}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FFF5F7] text-[#6B1736] group-hover:scale-105 transition-transform">
                    <QrCode className="w-6 h-6" />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0E6E8] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8E8E93] block">
                      Attendee
                    </span>
                    <span className="font-bold text-[#1A1A1A]">{ticket.attendeeName}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-[#6B1736]">
                    <span>View QR Pass</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
