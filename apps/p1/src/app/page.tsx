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
  Music,
  Laptop,
  Smile,
  Trophy,
  Heart,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import { GlassCard, GlassBadge, GlassButton } from '@firefly/ui';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';

export default function ReservaAttendeeHomePage() {
  const [events, setEvents] = useState<Event[]>(() => p1Storage.getEvents());
  const [tiers, setTiers] = useState<TicketTier[]>(() => p1Storage.getTiers());
  const [isLoading, setIsLoading] = useState(() => p1Storage.getEvents().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check saved events from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('reserva_saved_events');
        if (saved) setSavedEventIds(JSON.parse(saved));
        const seen = localStorage.getItem('reserva_onboarding_dismissed');
        if (!seen) setShowOnboarding(true);
      } catch {}
    }

    const updateData = () => {
      const liveEvents = p1Storage.getEvents();
      setEvents(liveEvents);
      setTiers(p1Storage.getTiers());
      setIsLoading(false);
    };

    updateData();
    const unsubscribe = p1Storage.subscribe(updateData);
    p1Storage.syncWithServer().finally(() => {
      updateData();
    });

    return () => unsubscribe();
  }, []);

  const toggleSaveEvent = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    let updated: string[];
    if (savedEventIds.includes(eventId)) {
      updated = savedEventIds.filter((id) => id !== eventId);
    } else {
      updated = [...savedEventIds, eventId];
    }
    setSavedEventIds(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('reserva_saved_events', JSON.stringify(updated));
      } catch {}
    }
  };

  const getStartingPrice = (eventId: string) => {
    const eventTiers = tiers.filter((t) => t.eventId === eventId && t.status === 'ACTIVE');
    if (eventTiers.length === 0) return null;
    return Math.min(...eventTiers.map((t) => t.priceInPence));
  };

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('reserva_onboarding_dismissed', 'true');
    }
  };

  const categories = [
    { id: 'ALL', label: 'All', icon: Sparkles },
    { id: 'MUSIC_FESTIVAL', label: 'Music', icon: Music },
    { id: 'CONFERENCE', label: 'Tech', icon: Laptop },
    { id: 'THEATRE_COMEDY', label: 'Comedy', icon: Smile },
    { id: 'SPORTS', label: 'Sports', icon: Trophy },
  ];

  const featuredEvent = events.find((e) => e.featured) || events[0];

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
    <div className="space-y-8 pb-8">
      {/* Optional Onboarding Hero Card (Screen 2 reference) */}
      {showOnboarding && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4E0F26] via-[#6B1736] to-[#801438] p-6 text-white shadow-xl">
          <div className="relative z-10 max-w-lg space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome to Reserva
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Discover & Book Amazing Events
            </h1>
            <p className="text-xs sm:text-sm text-white/80">
              Concerts, workshops, sports, cultural fests and exclusive live experiences.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={dismissOnboarding}
                className="px-5 py-2.5 rounded-xl bg-white text-[#6B1736] text-xs font-bold shadow-md hover:bg-white/90 transition-all"
              >
                Get Started
              </button>
              <button
                onClick={dismissOnboarding}
                className="text-xs text-white/70 hover:text-white font-medium transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
        </div>
      )}

      {/* Search Input Bar (Screen 4 reference) */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
        <input
          type="text"
          placeholder="Search events, venues, artists..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-[#F0E6E8] text-xs text-[#1A1A1A] placeholder-[#8E8E93] shadow-sm focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/30 transition-all"
        />
      </div>

      {/* Featured Event Hero Banner (Screen 4 reference) */}
      {featuredEvent && !searchQuery && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
              Featured Experience
            </h2>
            <Link
              href={`/event/${featuredEvent.slug || featuredEvent.id}`}
              className="text-xs font-semibold text-[#6B1736] hover:underline flex items-center gap-0.5"
            >
              <span>Explore</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Link
            href={`/event/${featuredEvent.slug || featuredEvent.id}`}
            className="group block relative overflow-hidden rounded-3xl h-56 sm:h-72 shadow-lg border border-[#F0E6E8]"
          >
            <img
              src={featuredEvent.posterUrl}
              alt={featuredEvent.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            {/* Top Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#6B1736] text-white text-[11px] font-bold shadow-md">
                Featured
              </span>
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-medium">
                {featuredEvent.category.replace('_', ' ')}
              </span>
            </div>

            {/* Bookmark button */}
            <button
              onClick={(e) => toggleSaveEvent(e, featuredEvent.id)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all"
              title="Save Event"
            >
              <Heart
                className={`w-4 h-4 ${
                  savedEventIds.includes(featuredEvent.id)
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-white'
                }`}
              />
            </button>

            {/* Content at Bottom */}
            <div className="absolute bottom-4 left-4 right-4 text-white space-y-1.5">
              <h3 className="text-lg sm:text-2xl font-bold tracking-tight">
                {featuredEvent.title}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-300" />
                  {new Date(featuredEvent.schedule.startsAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  {featuredEvent.venue.name}, {featuredEvent.venue.city}
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Category Filter Pills (Screen 4 reference) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
            Categories
          </h2>
          <Link
            href="/explore"
            className="text-xs font-semibold text-[#6B1736] hover:underline"
          >
            See All
          </Link>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#6B1736] text-white shadow-md shadow-[#6B1736]/20'
                    : 'bg-white text-[#333333] border border-[#F0E6E8] hover:border-[#6B1736]/30 hover:bg-[#FFF5F7]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#6B1736]'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Trending Events Grid (Screen 4 reference) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A]">
              {selectedCategory === 'ALL' ? 'Trending Events' : 'Filtered Events'}
            </h2>
            <p className="text-xs text-[#666666]">
              Handpicked live experiences happening soon
            </p>
          </div>
          <Link
            href="/explore"
            className="text-xs font-semibold text-[#6B1736] hover:underline flex items-center gap-0.5"
          >
            <span>See All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-3xl bg-white animate-pulse border border-[#F0E6E8]"
              />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white border border-[#F0E6E8] space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FDF2F4] text-[#6B1736] mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">No Events Found</h3>
            <p className="text-xs text-[#666666]">
              Try choosing a different category or clearing your search filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="text-xs text-[#6B1736] font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filteredEvents.map((evt) => {
              const startDate = new Date(evt.schedule.startsAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const startingPrice = getStartingPrice(evt.id);
              const isSaved = savedEventIds.includes(evt.id);

              return (
                <Link
                  key={evt.id}
                  href={`/event/${evt.slug || evt.id}`}
                  className="group block bg-white rounded-3xl overflow-hidden border border-[#F0E6E8] shadow-[0_4px_20px_rgba(107,23,54,0.04)] hover:shadow-[0_8px_30px_rgba(107,23,54,0.10)] hover:border-[#6B1736]/30 transition-all duration-300 flex flex-col"
                >
                  {/* Poster Image Container */}
                  <div className="relative h-44 w-full overflow-hidden bg-neutral-100">
                    <img
                      src={evt.posterUrl}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Category Tag in Light Rose Pill */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-[#FDF2F4]/90 backdrop-blur-sm text-[#6B1736] text-[10px] font-bold border border-[#FCE7EC] shadow-sm">
                        {evt.category.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Bookmark Heart Button */}
                    <button
                      onClick={(e) => toggleSaveEvent(e, evt.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-[#1A1A1A] shadow-md backdrop-blur-sm transition-all"
                      title={isSaved ? 'Remove from Saved' : 'Save Event'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#666666]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-[#666666] font-medium">
                        <span className="flex items-center gap-1 text-[#6B1736]">
                          <Calendar className="w-3 h-3" />
                          {startDate}
                        </span>
                        <span>•</span>
                        <span className="truncate">{evt.venue.city}</span>
                      </div>

                      <h3 className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#6B1736] transition-colors line-clamp-1">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-[#666666] line-clamp-2">
                        {evt.tagline || evt.description}
                      </p>
                    </div>

                    {/* Card Footer: Price & CTA */}
                    <div className="pt-2.5 border-t border-[#F0E6E8] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#8E8E93] uppercase block font-medium">
                          From
                        </span>
                        <span className="text-sm font-extrabold text-[#1A1A1A]">
                          {startingPrice ? formatINR(startingPrice) : 'Open Entry'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-[#6B1736] group-hover:translate-x-0.5 transition-transform">
                        <span>Book</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Organize an Event CTA Banner (Screen 16 reference) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF5F7] to-[#FDF2F4] border border-[#FCE7EC] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-lg">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B1736] uppercase tracking-wider">
              <PlusCircle className="w-4 h-4" />
              Reserva For Organizers
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A]">
              Organize an Event
            </h3>
            <p className="text-xs sm:text-sm text-[#666666]">
              Create, manage and sell tickets for your concerts, college fests, or workshops on Reserva.
            </p>
          </div>

          <Link href="/organiser">
            <GlassButton variant="primary" size="md" className="whitespace-nowrap">
              Go to Organizer Portal
            </GlassButton>
          </Link>
        </div>
      </section>
    </div>
  );
}
