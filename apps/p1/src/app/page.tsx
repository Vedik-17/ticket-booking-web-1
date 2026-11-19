'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  Search,
  Tag,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';

export default function P1EventsDashboardPage() {
  const [events, setEvents] = useState<Event[]>(() => p1Storage.getEvents());
  const [tiers, setTiers] = useState<TicketTier[]>(() => p1Storage.getTiers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    setEvents(p1Storage.getEvents());
    setTiers(p1Storage.getTiers());
  }, []);

  const getStartingPrice = (eventId: string) => {
    const eventTiers = tiers.filter((t) => t.eventId === eventId && t.status === 'ACTIVE');
    if (eventTiers.length === 0) return null;
    const lowest = Math.min(...eventTiers.map((t) => t.priceInPence));
    return lowest;
  };

  const filteredEvents = events.filter((evt) => {
    if (selectedCategory !== 'ALL' && evt.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchCity = evt.venue.city.toLowerCase().includes(q);
      const matchDesc = evt.description.toLowerCase().includes(q);
      if (!matchTitle && !matchCity && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="text-center py-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#FF9A45]" />
          <span className="text-xs font-medium text-white/80">
            Direct UPI Event Ticketing Platform
          </span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto">
          Upcoming Live{' '}
          <span className="bg-gradient-to-r from-[#FF6A1A] to-[#FF9A45] bg-clip-text text-transparent">
            Experiences
          </span>
        </h1>

        <p className="text-xs md:text-sm text-white/60 max-w-xl mx-auto">
          Explore upcoming music festivals, exhibitions, and parties. Instant booking with direct UPI app payment and WhatsApp QR passes.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] px-3 py-1 rounded-xl border border-white/[0.06]">
            <Zap className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Zero Gateway Fees</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] px-3 py-1 rounded-xl border border-white/[0.06]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>No Email Required</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] px-3 py-1 rounded-xl border border-white/[0.06]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Direct WhatsApp QR Ticket</span>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto pt-3">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by event or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#141414]/90 border border-white/[0.10] text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#FF6A1A]/60 shadow-lg backdrop-blur-xl"
            />
          </div>
        </div>
      </section>

      {/* Events Listing */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Available Events</span>
            <span className="text-xs font-normal text-white/40 font-mono">({filteredEvents.length})</span>
          </h2>
        </div>

        {events.length === 0 ? (
          <GlassCard className="text-center py-16 px-4 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.10] mx-auto flex items-center justify-center text-[#FF9A45]">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Upcoming Events Published Yet</h3>
              <p className="text-xs text-white/50 max-w-sm mx-auto">
                All live experiences will appear here as soon as tickets go on sale. Check back soon!
              </p>
            </div>
          </GlassCard>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 space-y-2 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-xs text-white/50">No events found matching your search.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="text-xs text-[#FF9A45] hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredEvents.map((evt) => {
              const startDate = new Date(evt.schedule.startsAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const startingPrice = getStartingPrice(evt.id);

              return (
                <Link key={evt.id} href={`/event/${evt.slug || evt.id}`} className="group block">
                  <GlassCard variant="interactive" padding="none" className="h-full flex flex-col">
                    <div className="relative h-48 w-full overflow-hidden bg-neutral-900">
                      <img
                        src={evt.posterUrl}
                        alt={evt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-85" />
                      <div className="absolute top-3 left-3">
                        <GlassBadge variant="accent" size="sm">
                          {evt.category.replace('_', ' ')}
                        </GlassBadge>
                      </div>
                      {evt.isAgeRestricted && (
                        <div className="absolute top-3 right-3">
                          <GlassBadge variant="error" size="sm">
                            {evt.minimumAge ? `${evt.minimumAge}+` : 'Adults Only'}
                          </GlassBadge>
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#FF9A45]" />
                            {startDate}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-white/40" />
                            {evt.venue.city}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white group-hover:text-[#FF9A45] transition-colors line-clamp-1">
                          {evt.title}
                        </h3>
                        <p className="text-xs text-white/60 line-clamp-2">
                          {evt.tagline || evt.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-white/40 uppercase block">Starting Rate</span>
                          <span className="text-sm font-semibold text-white">
                            {startingPrice ? formatINR(startingPrice) : 'Open Entry'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-semibold text-[#FF9A45] group-hover:translate-x-0.5 transition-transform">
                          <span>Details & Book</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
