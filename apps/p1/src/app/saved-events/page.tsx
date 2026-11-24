'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Calendar, MapPin, ArrowRight, ArrowLeft } from 'lucide-react';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';

export default function SavedEventsPage() {
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tiers, setTiers] = useState<TicketTier[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('reserva_saved_events');
        if (saved) setSavedEventIds(JSON.parse(saved));
      } catch {}
    }

    setEvents(p1Storage.getEvents());
    setTiers(p1Storage.getTiers());
  }, []);

  const removeSaved = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = savedEventIds.filter((item) => item !== id);
    setSavedEventIds(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('reserva_saved_events', JSON.stringify(updated));
      } catch {}
    }
  };

  const savedEvents = events.filter((e) => savedEventIds.includes(e.id));

  const getStartingPrice = (eventId: string) => {
    const eventTiers = tiers.filter((t) => t.eventId === eventId && t.status === 'ACTIVE');
    if (eventTiers.length === 0) return null;
    return Math.min(...eventTiers.map((t) => t.priceInPence));
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#6B1736] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Profile</span>
        </Link>
        <span className="text-xs text-[#8E8E93] font-medium">
          {savedEvents.length} Saved
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Saved Events</h1>
        <p className="text-xs text-[#666666]">
          Live experiences and festivals you have bookmarked
        </p>
      </div>

      <div className="space-y-4">
        {savedEvents.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#F0E6E8] space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FDF2F4] text-rose-500 mx-auto flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A]">No Saved Events Yet</h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto">
              Tap the heart icon on any event card to save it for quick booking later.
            </p>
            <Link
              href="/explore"
              className="inline-block px-5 py-2.5 rounded-xl bg-[#6B1736] text-white text-xs font-bold shadow-sm hover:bg-[#520F27] transition-all"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          savedEvents.map((evt) => {
            const price = getStartingPrice(evt.id);
            return (
              <Link
                key={evt.id}
                href={`/event/${evt.slug || evt.id}`}
                className="group flex items-center gap-4 bg-white rounded-3xl p-3.5 border border-[#F0E6E8] shadow-sm hover:border-[#6B1736]/30 hover:shadow-md transition-all"
              >
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-neutral-100 shrink-0">
                  <img
                    src={evt.posterUrl}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                  <span className="text-[10px] font-bold text-[#6B1736] uppercase tracking-wider block">
                    {evt.category.replace('_', ' ')}
                  </span>
                  <h3 className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#6B1736] transition-colors truncate">
                    {evt.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-[#666666]">
                    <span className="flex items-center gap-1 text-[#6B1736]">
                      <Calendar className="w-3 h-3" />
                      {new Date(evt.schedule.startsAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="truncate">{evt.venue.city}</span>
                  </div>
                  <div className="text-xs font-extrabold text-[#1A1A1A] pt-1">
                    {price ? formatINR(price) : 'Open Entry'}
                  </div>
                </div>

                <button
                  onClick={(e) => removeSaved(e, evt.id)}
                  className="p-2.5 rounded-full hover:bg-rose-50 text-rose-500 transition-colors shrink-0"
                  title="Remove from saved"
                >
                  <Heart className="w-4 h-4 fill-rose-500" />
                </button>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
