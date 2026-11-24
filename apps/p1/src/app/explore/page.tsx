'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Calendar,
  MapPin,
  Bookmark,
  SlidersHorizontal,
  X,
  ArrowRight,
  Sparkles,
  ChevronDown,
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
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'popular' | 'date' | 'priceAsc' | 'priceDesc'>('popular');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

  // Category counts calculation
  const categoryFilters = [
    {
      id: 'ALL',
      label: 'All Categories',
      count: events.length,
    },
    {
      id: 'CONCERTS',
      label: 'Concerts',
      matches: (c: string) => c === 'CONCERT' || c === 'MUSIC_FESTIVAL',
      count: events.filter((e) => e.category === 'CONCERT' || e.category === 'MUSIC_FESTIVAL').length,
    },
    {
      id: 'FESTIVALS',
      label: 'Festivals',
      matches: (c: string) => c === 'EXHIBITION' || c === 'NIGHTLIFE',
      count: events.filter((e) => e.category === 'EXHIBITION' || e.category === 'NIGHTLIFE').length,
    },
    {
      id: 'WORKSHOPS',
      label: 'Workshops',
      matches: (c: string) => c === 'CONFERENCE',
      count: events.filter((e) => e.category === 'CONFERENCE' && !e.title.toLowerCase().includes('trip') && !e.title.toLowerCase().includes('araku')).length,
    },
    {
      id: 'TRAVEL',
      label: 'Travel',
      matches: (c: string) => c === 'CONFERENCE' && (c.includes('trip') || c.includes('hampi') || c.includes('araku')),
      count: events.filter((e) => e.title.toLowerCase().includes('trip') || e.title.toLowerCase().includes('araku') || e.title.toLowerCase().includes('hampi')).length,
    },
    {
      id: 'CULTURE',
      label: 'Culture',
      matches: (c: string) => c === 'THEATRE_COMEDY' || c === 'EXHIBITION',
      count: events.filter((e) => e.category === 'THEATRE_COMEDY' || e.title.toLowerCase().includes('culture')).length,
    },
  ];

  const filteredEvents = events
    .filter((evt) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const catObj = categoryFilters.find((f) => f.id === selectedCategory);
        if (catObj?.matches) {
          if (!catObj.matches(evt.category) && !catObj.matches(evt.title.toLowerCase())) {
            const isTravelMatch = selectedCategory === 'TRAVEL' && (evt.title.toLowerCase().includes('trip') || evt.title.toLowerCase().includes('araku') || evt.title.toLowerCase().includes('hampi'));
            const isCultureMatch = selectedCategory === 'CULTURE' && evt.title.toLowerCase().includes('culture');
            if (!isTravelMatch && !isCultureMatch) return false;
          }
        }
      }

      // City filter
      if (selectedCity !== 'ALL' && !evt.venue.city.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }

      // Search query
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
      if (sortBy === 'popular') {
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      }
      return new Date(a.schedule.startsAt).getTime() - new Date(b.schedule.startsAt).getTime();
    });

  const clearFilters = () => {
    setSelectedCategory('ALL');
    setSelectedDateFilter('ALL');
    setSelectedCity('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Header Row matching Reference Mockup */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8DCCB] pb-6">
        <div>
          <h1 className="font-serif text-3xl sm:text-5xl tracking-tight text-[#171D2B]">
            Events around <span className="italic text-[#B64A38]">you</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5A626A] mt-2 max-w-xl font-sans">
            Explore live concerts, heritage getaways, independent film screenings and artisan festivals.
          </p>
        </div>

        {/* Vintage Architectural Dome Illustration (SVG) */}
        <div className="hidden md:flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <svg className="w-28 h-14 text-[#742F42]" viewBox="0 0 140 70" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M 70 5 L 70 12 M 65 12 Q 70 8 75 12 L 85 24 Q 95 38 100 48 L 100 68 L 40 68 L 40 48 Q 45 38 55 24 Z" />
            <path d="M 50 68 L 50 48 M 60 68 L 60 48 M 70 68 L 70 48 M 80 68 L 80 48 M 90 68 L 90 48" />
            <path d="M 30 68 L 110 68" strokeWidth="2" />
            <circle cx="70" cy="5" r="2.5" fill="currentColor" />
            <path d="M 20 68 Q 28 60 38 68" strokeDasharray="2 2" />
            <path d="M 102 68 Q 112 60 122 68" strokeDasharray="2 2" />
          </svg>
        </div>
      </div>

      {/* Global Search Bar with Filter Trigger */}
      <div className="relative flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8293A0]" />
          <input
            type="text"
            placeholder="Search events, destinations or experiences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[#FFFDF9] border border-[#E8DCCB] text-xs sm:text-sm text-[#171D2B] placeholder-[#8293A0] shadow-[0_2px_10px_rgba(23,29,43,0.03)] focus:outline-none focus:border-[#742F42] focus:ring-1 focus:ring-[#742F42]/30 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#8293A0] hover:text-[#171D2B]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Filter Button */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="md:hidden flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-[#FFFDF9] border border-[#E8DCCB] text-xs font-bold text-[#171D2B]"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#742F42]" />
          <span>Filters</span>
        </button>
      </div>

      {/* Main Grid: Sidebar + Cards matching Desktop Reference */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Filter Column (Desktop) */}
        <div
          className={`${
            showMobileFilters ? 'block' : 'hidden md:block'
          } md:col-span-3 space-y-6 bg-[#FFFDF9] p-5 rounded-2xl border border-[#E8DCCB] shadow-[0_2px_12px_rgba(23,29,43,0.03)]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E8DCCB] pb-3">
            <span className="font-serif text-lg font-bold text-[#171D2B]">Filters</span>
            {(selectedCategory !== 'ALL' || selectedCity !== 'ALL' || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-[#B64A38] hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Category Checkboxes with Counts */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293A0] block">
              Category
            </span>
            <div className="space-y-1.5">
              {categoryFilters.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <label
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="flex items-center justify-between py-1 px-1 rounded cursor-pointer group hover:bg-[#F4EBDD]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded border-[#D5B77B] text-[#742F42] focus:ring-[#742F42]"
                      />
                      <span
                        className={`text-xs ${
                          isSelected ? 'font-bold text-[#171D2B]' : 'text-[#5A626A] group-hover:text-[#171D2B]'
                        }`}
                      >
                        {cat.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8293A0] font-medium">({cat.count})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-2.5 pt-4 border-t border-[#E8DCCB]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293A0] block">
              Date
            </span>
            <div className="space-y-1.5 text-xs text-[#5A626A]">
              {[
                { id: 'ALL', label: 'All Upcoming' },
                { id: 'WEEK', label: 'This Week' },
                { id: 'MONTH', label: 'This Month' },
                { id: 'CUSTOM', label: 'Custom Range' },
              ].map((d) => (
                <label
                  key={d.id}
                  onClick={() => setSelectedDateFilter(d.id)}
                  className="flex items-center gap-2.5 py-1 px-1 cursor-pointer hover:text-[#171D2B]"
                >
                  <input
                    type="radio"
                    name="dateFilter"
                    checked={selectedDateFilter === d.id}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 text-[#742F42] focus:ring-[#742F42]"
                  />
                  <span className={selectedDateFilter === d.id ? 'font-bold text-[#171D2B]' : ''}>
                    {d.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Location Filter */}
          <div className="space-y-2.5 pt-4 border-t border-[#E8DCCB]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8293A0] block">
              Location
            </span>
            <div className="space-y-1.5 text-xs text-[#5A626A]">
              {['ALL', 'Hyderabad', 'Bangalore', 'Araku Valley', 'Hampi', 'Mumbai'].map((c) => (
                <label
                  key={c}
                  onClick={() => setSelectedCity(c)}
                  className="flex items-center gap-2.5 py-1 px-1 cursor-pointer hover:text-[#171D2B]"
                >
                  <input
                    type="radio"
                    name="cityFilter"
                    checked={selectedCity === c}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 text-[#742F42] focus:ring-[#742F42]"
                  />
                  <span className={selectedCity === c ? 'font-bold text-[#171D2B]' : ''}>
                    {c === 'ALL' ? 'All Locations' : c}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Area: Results Count, Sort, and Event Grid */}
        <div className="md:col-span-9 space-y-5">
          {/* Top Bar: Count & Sort Dropdown */}
          <div className="flex items-center justify-between text-xs text-[#5A626A]">
            <span className="font-sans">
              <strong className="text-[#171D2B] font-bold">{filteredEvents.length}</strong> events found
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[#8293A0] font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#FFFDF9] border border-[#E8DCCB] rounded-xl px-2.5 py-1 text-xs text-[#171D2B] font-bold focus:outline-none focus:border-[#742F42]"
              >
                <option value="popular">Popular</option>
                <option value="date">Upcoming Date</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Event Cards Grid (3 Columns on Large Screens) */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#FFFDF9] border border-[#E8DCCB] space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#F4EBDD] text-[#742F42] mx-auto flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#171D2B]">No events found</h3>
              <p className="text-xs text-[#5A626A] max-w-sm mx-auto font-sans">
                We couldn&apos;t find any events matching your current filters. Try selecting a different city or category.
              </p>
              <button
                onClick={clearFilters}
                className="mt-2 text-xs font-bold text-[#742F42] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEvents.map((evt) => {
                const startDate = new Date(evt.schedule.startsAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const price = getStartingPrice(evt.id);
                const isSaved = savedEventIds.includes(evt.id);

                return (
                  <Link
                    key={evt.id}
                    href={`/event/${evt.slug || evt.id}`}
                    className="group block bg-[#FFFDF9] rounded-2xl overflow-hidden border border-[#E8DCCB] shadow-[0_2px_10px_rgba(23,29,43,0.03)] hover:shadow-[0_8px_24px_rgba(23,29,43,0.08)] hover:border-[#D5B77B] transition-all duration-300 flex flex-col"
                  >
                    {/* Poster Image with Ribbon Bookmark Button */}
                    <div className="relative h-44 w-full overflow-hidden bg-neutral-100">
                      <img
                        src={evt.posterUrl}
                        alt={evt.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                      {/* Bookmark Icon Top Right */}
                      <button
                        onClick={(e) => toggleSaveEvent(e, evt.id)}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-[#171D2B] shadow-md backdrop-blur-sm transition-all"
                        title="Bookmark Experience"
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            isSaved ? 'fill-[#B64A38] text-[#B64A38]' : 'text-[#171D2B]'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5A626A]">
                          <span className="flex items-center gap-1 text-[#B64A38] font-bold">
                            <Calendar className="w-3 h-3" />
                            {startDate}
                          </span>
                          <span>•</span>
                          <span className="truncate">{evt.venue.city}</span>
                        </div>

                        <h3 className="font-serif text-base font-bold text-[#171D2B] group-hover:text-[#742F42] transition-colors line-clamp-1">
                          {evt.title}
                        </h3>

                        <p className="text-xs text-[#5A626A] line-clamp-2 font-sans">
                          {evt.tagline || evt.description}
                        </p>
                      </div>

                      {/* Price & Action */}
                      <div className="pt-2.5 border-t border-[#E8DCCB] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#8293A0] uppercase block font-medium">
                            From
                          </span>
                          <span className="text-sm font-extrabold text-[#171D2B]">
                            {price ? formatINR(price) : 'Free Entry'}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-[#E8DCCB] flex items-center justify-center text-[#171D2B] group-hover:bg-[#742F42] group-hover:text-white group-hover:border-[#742F42] transition-colors">
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
    </div>
  );
}
