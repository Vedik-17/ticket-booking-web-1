'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  Search,
  Music,
  Tent,
  Compass,
  Briefcase,
  Landmark,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Event, TicketTier } from '@firefly/shared-types';
import { formatINR } from '@firefly/core';
import { p1Storage } from '@/lib/idb-storage';

export default function ReservaEditorialHomePage() {
  const [events, setEvents] = useState<Event[]>(() => p1Storage.getEvents());
  const [tiers, setTiers] = useState<TicketTier[]>(() => p1Storage.getTiers());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    if (eventTiers.length === 0) return null;
    return Math.min(...eventTiers.map((t) => t.priceInPence));
  };

  const scrollSlider = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const categories = [
    { id: 'ALL', label: 'All', icon: Sparkles },
    { id: 'CONCERT', label: 'Concerts', icon: Music },
    { id: 'MUSIC_FESTIVAL', label: 'Festivals', icon: Tent },
    { id: 'CONFERENCE', label: 'Travel & Trips', icon: Compass },
    { id: 'EXHIBITION', label: 'Workshops', icon: Briefcase },
    { id: 'THEATRE_COMEDY', label: 'Culture', icon: Landmark },
  ];

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
    <div className="space-y-16 pb-12">
      {/* 1. EDITORIAL MAGAZINE HERO SECTION (Reference Image Left Hero) */}
      <section className="relative pt-2 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Search */}
          <div className="lg:col-span-7 space-y-6 z-10">
            <div className="space-y-3">
              <h1 className="font-serif text-4xl sm:text-6xl lg:text-[68px] font-bold text-[#171D2B] leading-[1.08] tracking-tight">
                Discover <br />
                Events &amp; Travel <br />
                <span className="italic font-normal text-[#742F42]">Experiences</span>
              </h1>
              <p className="text-sm sm:text-base text-[#171D2B]/75 max-w-lg font-medium leading-relaxed">
                Book tickets for concerts, festivals, workshops and curated trips across India with instant pass delivery.
              </p>
            </div>

            {/* Pill Search Input Container */}
            <div className="max-w-xl">
              <div className="relative flex items-center bg-white rounded-full border border-[#E8DFD3] shadow-[0_8px_30px_rgba(23,29,43,0.06)] p-1.5 transition-all focus-within:border-[#742F42] focus-within:shadow-[0_8px_30px_rgba(116,47,66,0.12)]">
                <Search className="w-4 h-4 text-[#8293A0] ml-3.5 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search events, destinations or experiences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-[#171D2B] placeholder-[#8293A0] focus:outline-none pr-3"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('curated-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#742F42] hover:bg-[#5C2434] text-white text-xs font-bold transition-transform active:scale-95 shrink-0 shadow-sm"
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Pills (Concerts, Festivals, Travel, Workshops, Culture) */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none pt-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                      isSelected
                        ? 'bg-[#742F42] text-white shadow-md shadow-[#742F42]/20'
                        : 'bg-white text-[#171D2B] border border-[#E8DFD3] hover:border-[#742F42]/40 hover:bg-[#F4EBDD]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#B64A38]'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Hand-Crafted Scrapbook Collage Composition */}
          <div className="lg:col-span-5 relative flex justify-center items-center py-6 select-none">
            {/* Washi Tape Yellow Accent in Top Corner */}
            <div className="absolute -top-3 left-4 w-12 h-6 bg-[#D5B77B]/85 rotate-12 z-20 shadow-sm backdrop-blur-sm pointer-events-none" />

            {/* Collage Canvas Container */}
            <div className="relative w-full max-w-sm sm:max-w-md aspect-[4/3] sm:aspect-square flex items-center justify-center">
              {/* Background Terracotta & Dusty Blue Paper Cutouts */}
              <div className="absolute -top-4 right-2 w-48 h-56 bg-[#B64A38]/90 rounded-2xl -rotate-6 shadow-md" />
              <div className="absolute bottom-2 left-2 w-52 h-44 bg-[#8293A0]/80 rounded-2xl rotate-3 shadow-md" />

              {/* Center Heritage Monument Cutout (Charminar / Architecture) */}
              <div className="relative w-[85%] h-[82%] rounded-2xl overflow-hidden shadow-2xl border-4 border-white z-10 bg-white">
                <img
                  src="https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=800&q=80"
                  alt="Heritage Monument"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </div>

              {/* Rubber Postmark Stamp: Circular "RESERVA • TRAVEL & EVENTS" */}
              <div className="absolute -top-2 right-0 w-24 h-24 rounded-full border-2 border-dashed border-[#742F42] text-[#742F42] flex flex-col items-center justify-center p-1 bg-white/90 backdrop-blur-sm shadow-md rotate-12 z-20 pointer-events-none">
                <span className="text-[7px] font-black uppercase tracking-widest text-[#742F42]">
                  ★ RESERVA ★
                </span>
                <span className="text-[10px] font-serif font-black uppercase text-[#B64A38] mt-0.5">
                  TRAVEL &amp; EVENTS
                </span>
                <span className="text-[8px] font-mono text-[#8293A0]">EST. 2026</span>
              </div>

              {/* Layered Polaroid Photo: Concert Crowd */}
              <div className="absolute -bottom-6 -right-2 sm:-right-6 w-52 sm:w-60 bg-white p-2.5 pb-5 rounded-xl shadow-2xl rotate-6 z-20 border border-[#E8DFD3] transition-transform hover:rotate-3 duration-300">
                <div className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-neutral-900">
                  <img
                    src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80"
                    alt="Live Concert Crowd"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="pt-2 text-center">
                  <span className="font-serif italic text-xs font-semibold text-[#171D2B]">
                    Arijit Singh Live • Nov 30
                  </span>
                </div>
              </div>

              {/* Wavy Postal Airmail Cancellation Lines */}
              <div className="absolute -bottom-2 left-6 w-32 h-8 z-15 opacity-60 pointer-events-none">
                <svg viewBox="0 0 120 30" className="w-full h-full stroke-[#742F42]" fill="none" strokeWidth="1.5">
                  <path d="M 0,5 Q 15,0 30,5 T 60,5 T 90,5 T 120,5" />
                  <path d="M 0,15 Q 15,10 30,15 T 60,15 T 90,15 T 120,15" />
                  <path d="M 0,25 Q 15,20 30,25 T 60,25 T 90,25 T 120,25" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CURATED PICKS THIS WEEK (Reference Image Middle Slider Section) */}
      <section id="curated-section" className="space-y-6 pt-4">
        {/* Section Header with Golden Brush Stroke Underline */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#171D2B]">
              Curated Picks <br className="sm:hidden" />
              <span className="relative inline-block text-[#171D2B]">
                This Week
                {/* Hand-Drawn Gold Underline */}
                <svg
                  className="absolute -bottom-2.5 left-0 w-full h-3 text-[#D5B77B] overflow-visible"
                  viewBox="0 0 140 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 3 8 Q 70 1 137 7"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/explore"
              className="text-xs font-bold text-[#742F42] hover:text-[#5C2434] transition-colors flex items-center gap-1 mr-2"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollSlider('left')}
                className="w-9 h-9 rounded-full bg-white border border-[#E8DFD3] text-[#171D2B] hover:bg-[#F4EBDD] flex items-center justify-center shadow-sm transition-all"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollSlider('right')}
                className="w-9 h-9 rounded-full bg-white border border-[#E8DFD3] text-[#171D2B] hover:bg-[#F4EBDD] flex items-center justify-center shadow-sm transition-all"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Sliding Cards Track */}
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-6 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory"
        >
          {filteredEvents.map((evt) => {
            const startDate = new Date(evt.schedule.startsAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const startingPrice = getStartingPrice(evt.id);
            const isSaved = savedEventIds.includes(evt.id);

            // Determine badge style
            let badgeBg = 'bg-[#742F42] text-white';
            let catLabel = 'Concert';
            if (evt.category === 'CONFERENCE') {
              badgeBg = 'bg-[#D5B77B] text-[#171D2B]';
              catLabel = 'Travel';
            } else if (evt.category === 'EXHIBITION') {
              badgeBg = 'bg-[#8293A0] text-white';
              catLabel = 'Festival';
            } else if (evt.category === 'MUSIC_FESTIVAL') {
              badgeBg = 'bg-[#B64A38] text-white';
              catLabel = 'Music';
            }

            return (
              <Link
                key={evt.id}
                href={`/event/${evt.slug || evt.id}`}
                className="group relative flex flex-col justify-between w-[290px] sm:w-[340px] shrink-0 bg-white rounded-3xl p-3.5 border border-[#E8DFD3] shadow-[0_4px_24px_rgba(23,29,43,0.04)] hover:shadow-[0_12px_36px_rgba(116,47,66,0.12)] hover:border-[#742F42]/30 transition-all duration-300 snap-start"
              >
                {/* Image Container with Rounded Frame & Hover Zoom */}
                <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-neutral-100">
                  <img
                    src={evt.posterUrl}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />

                  {/* Category Pill Tag */}
                  <div className="absolute bottom-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-md ${badgeBg}`}>
                      {catLabel}
                    </span>
                  </div>

                  {/* Bookmark Button in Top Right */}
                  <button
                    onClick={(e) => toggleSaveEvent(e, evt.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-[#171D2B] shadow-md backdrop-blur-sm transition-all"
                    title={isSaved ? 'Remove from Saved' : 'Save'}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        isSaved ? 'fill-[#B64A38] text-[#B64A38]' : 'text-[#171D2B]'
                      }`}
                    />
                  </button>
                </div>

                {/* Card Information */}
                <div className="p-2 pt-3 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-base sm:text-lg text-[#171D2B] group-hover:text-[#742F42] transition-colors line-clamp-1">
                      {evt.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-[#171D2B]/70 font-medium pt-0.5">
                      <span className="flex items-center gap-1 text-[#B64A38]">
                        <Calendar className="w-3.5 h-3.5" />
                        {startDate}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#8293A0]" />
                        {evt.venue.city}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Price & Arrow Button */}
                  <div className="pt-2 border-t border-[#E8DFD3]/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#8293A0] block">
                        Tickets from
                      </span>
                      <span className="text-sm font-extrabold text-[#171D2B]">
                        {startingPrice ? formatINR(startingPrice) : 'Open Entry'}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-[#F4EBDD] group-hover:bg-[#742F42] group-hover:text-white text-[#171D2B] flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. PROMOTIONAL GETAWAY BANNER (Reference Image Bottom Banner) */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-[#E8DFD3] shadow-[0_8px_32px_rgba(23,29,43,0.05)]">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center">
          {/* Coastal Photography Left Slice */}
          <div className="md:col-span-4 h-56 md:h-64 w-full overflow-hidden bg-neutral-100">
            <img
              src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
              alt="Plan Your Next Getaway"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Center Callout & Action */}
          <div className="md:col-span-5 p-6 sm:p-8 space-y-3">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#171D2B] leading-tight">
              Plan Your Next <br />
              <span className="text-[#B64A38] italic font-normal">Getaway</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#171D2B]/70 font-medium">
              Explore curated travel experiences, weekend trails, group trips and upcoming travel events.
            </p>
            <div className="pt-1">
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#742F42] hover:bg-[#5C2434] text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <span>Explore Travel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Vintage Lighthouse Illustration & Wavy Postmark */}
          <div className="md:col-span-3 hidden md:flex items-center justify-center p-6 relative">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Golden Sun Disc */}
              <div className="absolute w-20 h-20 rounded-full bg-[#D5B77B]/40 blur-xs" />
              {/* Lighthouse / Monument Icon */}
              <div className="relative z-10 w-16 h-24 flex items-center justify-center">
                <Landmark className="w-16 h-16 text-[#742F42]" />
              </div>
              {/* Postmark Waves */}
              <div className="absolute -left-12 top-8 w-24 h-8 opacity-40 pointer-events-none">
                <svg viewBox="0 0 100 20" className="w-full h-full stroke-[#742F42]" fill="none" strokeWidth="1.5">
                  <path d="M 0,5 Q 12,0 25,5 T 50,5 T 75,5 T 100,5" />
                  <path d="M 0,15 Q 12,10 25,15 T 50,15 T 75,15 T 100,15" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ORGANIZER ENTRY CTA SECTION */}
      <section className="rounded-3xl bg-[#F4EBDD] border border-[#E8DFD3] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-lg">
          <span className="text-[10px] uppercase font-bold text-[#742F42] tracking-wider block">
            Reserva for Organizers
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#171D2B]">
            Hosting a concert, festival, or workshop?
          </h3>
          <p className="text-xs sm:text-sm text-[#171D2B]/70">
            Publish tickets in minutes with zero platform gateway lock-in, direct UPI settlements and offline QR check-in.
          </p>
        </div>

        <Link
          href="/organiser"
          className="px-6 py-3 rounded-full bg-[#171D2B] hover:bg-[#742F42] text-white text-xs font-bold transition-all shadow-md text-center shrink-0"
        >
          Go to Organizer Portal
        </Link>
      </section>
    </div>
  );
}
