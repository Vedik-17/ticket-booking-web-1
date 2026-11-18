'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Calendar, MapPin, Tag, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Event, EventCategory } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';

const CATEGORIES: Array<{ key: EventCategory | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All Experiences' },
  { key: 'MUSIC_FESTIVAL', label: 'Music Festivals' },
  { key: 'CONCERT', label: 'Concerts' },
  { key: 'EXHIBITION', label: 'Exhibitions' },
  { key: 'NIGHTLIFE', label: 'Nightlife & Parties' },
  { key: 'CONFERENCE', label: 'Conferences' },
];

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (data.success && data.events) {
          setEvents(data.events);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const filteredEvents = events.filter((event) => {
    if (selectedCategory !== 'ALL' && event.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = event.title.toLowerCase().includes(q);
      const matchesCity = event.venue.city.toLowerCase().includes(q);
      const matchesDesc = event.description.toLowerCase().includes(q);
      if (!matchesTitle && !matchesCity && !matchesDesc) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative text-center py-12 md:py-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#FF9A45]" />
          <span className="text-xs font-medium text-white/80 tracking-wide">
            Next-Generation Event Ticketing
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Live Experiences Crafted for the{' '}
          <span className="bg-gradient-to-r from-[#FF6A1A] via-[#FF9A45] to-amber-200 bg-clip-text text-transparent">
            Extraordinary
          </span>
        </h1>

        <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto font-normal">
          Concerts, electronic festivals, art exhibits, and cultural gatherings. Instant guest checkout, cryptographic QR passes, and zero friction.
        </p>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.06]">
            <Zap className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Guest Checkout by Default</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.06]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Counterfeit QR Nonce</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.06]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Multi-Tenant Organiser SaaS</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto pt-4">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by event, artist, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#141414]/90 border border-white/[0.10] text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#FF6A1A]/60 focus:ring-1 focus:ring-[#FF6A1A]/50 shadow-lg backdrop-blur-xl transition-all"
            />
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
              selectedCategory === cat.key
                ? 'bg-gradient-to-r from-[#FF6A1A]/20 to-[#FF9A45]/20 text-[#FF9A45] border-[#FF6A1A]/40 shadow-sm'
                : 'bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] border-white/[0.06]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </section>

      {/* Events Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Featured Experiences</span>
            <span className="text-xs font-normal text-white/40">({filteredEvents.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.05]" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 space-y-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-white/60">No events matched your current filters.</p>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-[#FF9A45] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const startDate = new Date(event.schedule.startsAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <Link key={event.id} href={`/event/${event.slug || event.id}`} className="group block">
                  <GlassCard variant="interactive" padding="none" className="h-full flex flex-col">
                    {/* Poster */}
                    <div className="relative h-52 w-full overflow-hidden bg-neutral-900">
                      <img
                        src={event.posterUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent opacity-80" />
                      <div className="absolute top-3 left-3">
                        <GlassBadge variant="accent" size="sm">
                          {event.category.replace('_', ' ')}
                        </GlassBadge>
                      </div>
                      {event.isAgeRestricted && (
                        <div className="absolute top-3 right-3">
                          <GlassBadge variant="error" size="sm">
                            {event.minimumAge ? `${event.minimumAge}+` : 'Adults Only'}
                          </GlassBadge>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#FF9A45]" />
                            {startDate}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-white/40" />
                            {event.venue.city}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-[#FF9A45] transition-colors line-clamp-1">
                          {event.title}
                        </h3>
                        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                          {event.tagline || event.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-white/40 uppercase tracking-wider block">Tickets</span>
                          <span className="text-sm font-semibold text-white">Available Now</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#FF9A45] group-hover:translate-x-0.5 transition-transform">
                          <span>Book</span>
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
