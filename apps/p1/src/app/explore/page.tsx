'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Calendar,
  MapPin,
  Heart,
  SlidersHorizontal,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';

export default function ExploreEventsPage() {
  const [events, setEvents] = useState<Event[]>(() => p1Storage.getEvents());
  const [tiers, setTiers] = useState<TicketTier[]>(() => p1Storage.getTiers());
  const [isLoading, setIsLoading] = useState(() => p1Storage.getEvents().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'priceAsc' | 'priceDesc'>('date');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('reserva_saved_events');
        if (saved) setSavedEventIds(JSON.parse(saved));
      } catch {}
    }

    const updateData = () => {
      setEvents(p1Storage.getEvents());
      setTiers(p1Storage.getTiers());
      setIsLoading(false);
    };

    updateData();
    const unsubscribe = p1Storage.subscribe(updateData);
    p1Storage.syncWithServer().finally(() => updateData());

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
    if (eventTiers.length === 0) return 0;
    return Math.min(...eventTiers.map((t) => t.priceInPence));
  };

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'MUSIC_FESTIVAL', label: 'Music' },
    { id: 'CONFERENCE', label: 'Tech' },
    { id: 'EXHIBITION', label: 'Workshop & Art' },
    { id: 'THEATRE_COMEDY', label: 'Comedy' },
    { id: 'NIGHTLIFE', label: 'Nightlife' },
    { id: 'SPORTS', label: 'Sports' },
  ];

  const cities = ['ALL', 'Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR'];

  const filteredEvents = events
    .filter((evt) => {
      if (selectedCategory !== 'ALL' && evt.category !== selectedCategory) {
        return false;
      }
      if (selectedCity !== 'ALL' && !evt.venue.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(q);
        const matchCity = evt.venue.city.toLowerCase().includes(q);
        const matchVenue = evt.venue.name.toLowerCase().includes(q);
        const matchDesc = evt.description.toLowerCase().includes(q);
        if (!matchTitle && !matchCity && !matchVenue && !matchDesc) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priceAsc') {
        return getStartingPrice(a.id) - getStartingPrice(b.id);
      }
      if (sortBy === 'priceDesc') {
        return getStartingPrice(b.id) - getStartingPrice(a.id);
      }
      return new Date(a.schedule.startsAt).getTime() - new Date(b.schedule.startsAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Explore Events</h1>
          <p className="text-xs text-[#666666]">
            Find concerts, comedy shows, hackathons, and sports events happening around you.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Search by name, venue, or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white border border-[#F0E6E8] text-xs text-[#1A1A1A] placeholder-[#8E8E93] shadow-sm focus:outline-none focus:border-[#6B1736] focus:ring-1 focus:ring-[#6B1736]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#8E8E93] hover:text-[#1A1A1A]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Chips (Screen 5 reference) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#6B1736] text-white shadow-sm'
                    : 'bg-white text-[#4A4A4A] border border-[#F0E6E8] hover:border-[#6B1736]/30 hover:bg-[#FFF5F7]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* City and Sort Selectors */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8E8E93] font-medium">City:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-[#F0E6E8] rounded-xl px-2.5 py-1 text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-[#6B1736]"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Cities' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#8E8E93] font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-[#F0E6E8] rounded-xl px-2.5 py-1 text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-[#6B1736]"
            >
              <option value="date">Upcoming Date</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#666666]">
          <span>
            Showing <strong className="text-[#1A1A1A]">{filteredEvents.length}</strong> events
          </span>
          {(selectedCategory !== 'ALL' || selectedCity !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedCity('ALL');
                setSearchQuery('');
              }}
              className="text-[#6B1736] font-semibold hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#F0E6E8] space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FDF2F4] text-[#6B1736] mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#1A1A1A]">No events found</h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto">
              We couldn&apos;t find any events matching your current filters. Try selecting a different city or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filteredEvents.map((evt) => {
              const startDate = new Date(evt.schedule.startsAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const price = getStartingPrice(evt.id);
              const isSaved = savedEventIds.includes(evt.id);

              return (
                <Link
                  key={evt.id}
                  href={`/event/${evt.slug || evt.id}`}
                  className="group block bg-white rounded-3xl overflow-hidden border border-[#F0E6E8] shadow-[0_4px_20px_rgba(107,23,54,0.04)] hover:shadow-[0_8px_30px_rgba(107,23,54,0.10)] hover:border-[#6B1736]/30 transition-all duration-300 flex flex-col"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-neutral-100">
                    <img
                      src={evt.posterUrl}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full bg-[#FDF2F4]/90 backdrop-blur-sm text-[#6B1736] text-[10px] font-bold border border-[#FCE7EC]">
                        {evt.category.replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={(e) => toggleSaveEvent(e, evt.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white text-[#1A1A1A] shadow-md backdrop-blur-sm transition-all"
                      title="Save"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isSaved ? 'fill-rose-500 text-rose-500' : 'text-[#666666]'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-[#666666]">
                        <span className="flex items-center gap-1 text-[#6B1736] font-semibold">
                          <Calendar className="w-3 h-3" />
                          {startDate}
                        </span>
                        <span>•</span>
                        <span>{evt.venue.city}</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#1A1A1A] group-hover:text-[#6B1736] transition-colors line-clamp-1">
                        {evt.title}
                      </h3>
                      <p className="text-xs text-[#666666] line-clamp-2">
                        {evt.tagline || evt.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-[#F0E6E8] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#8E8E93] uppercase block font-medium">
                          From
                        </span>
                        <span className="text-sm font-extrabold text-[#1A1A1A]">
                          {price ? formatINR(price) : 'Free Entry'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#6B1736] group-hover:translate-x-0.5 transition-transform">
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
