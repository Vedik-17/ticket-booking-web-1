'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Search, ChevronDown, User, Sparkles, PlusCircle } from 'lucide-react';
import { ReservaLogo } from './ReservaLogo';

interface ReservaHeaderProps {
  onOpenAuth?: () => void;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
}

export const ReservaHeader: React.FC<ReservaHeaderProps> = ({
  onOpenAuth,
  selectedCity = 'Hyderabad',
  onSelectCity,
}) => {
  const pathname = usePathname();
  const [showCityMenu, setShowCityMenu] = useState(false);

  // If on organizer portal, use the dedicated Organizer navigation
  if (pathname.startsWith('/organiser')) {
    return null;
  }

  const cities = ['Hyderabad', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Goa', 'Chennai'];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#F0E6E8] shadow-[0_2px_12px_rgba(107,23,54,0.03)]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Location */}
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <ReservaLogo size="md" showSubtitle={false} />
          </Link>

          {/* Location Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCityMenu(!showCityMenu)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FDF2F4] text-[#6B1736] border border-[#FCE7EC] text-xs font-semibold hover:bg-[#FCE7EC] transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#6B1736]" />
              <span>{selectedCity}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showCityMenu && (
              <div className="absolute left-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-[#F0E6E8] py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#8E8E93] tracking-wider">
                  Select City
                </div>
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      if (onSelectCity) onSelectCity(city);
                      setShowCityMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      selectedCity === city
                        ? 'bg-[#FDF2F4] text-[#6B1736] font-bold'
                        : 'text-[#333333] hover:bg-[#FFF5F7]'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Search Link on Desktop */}
        <div className="hidden md:flex flex-1 max-w-sm mx-4">
          <Link
            href="/explore"
            className="w-full flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#F7F2F4] text-xs text-[#8E8E93] border border-[#F0E6E8] hover:border-[#6B1736]/30 hover:bg-white transition-all shadow-inner"
          >
            <Search className="w-3.5 h-3.5 text-[#8E8E93]" />
            <span>Search events, artists, venues...</span>
          </Link>
        </div>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/explore"
            className="md:hidden p-2 rounded-full text-[#6B1736] hover:bg-[#FDF2F4] transition-colors"
            title="Explore Events"
          >
            <Search className="w-5 h-5" />
          </Link>

          {/* Desktop Links */}
          <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#4A4A4A]">
            <Link
              href="/explore"
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                pathname === '/explore' ? 'text-[#6B1736] bg-[#FDF2F4]' : 'hover:text-[#6B1736]'
              }`}
            >
              Explore
            </Link>
            <Link
              href="/my-tickets"
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                pathname.startsWith('/my-tickets') ? 'text-[#6B1736] bg-[#FDF2F4]' : 'hover:text-[#6B1736]'
              }`}
            >
              My Tickets
            </Link>
          </div>

          {/* Organize an Event (Redirect to Organizer Portal) */}
          <Link
            href="/organiser"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFF5F7] hover:bg-[#FDF2F4] text-[#6B1736] border border-[#FCE7EC] text-xs font-bold transition-all shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Organize an Event</span>
            <span className="sm:hidden">Organize</span>
          </Link>

          {/* User Profile / Login Button */}
          <Link
            href="/profile"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#6B1736] text-white hover:bg-[#520F27] transition-all shadow-sm"
            title="My Profile"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
};
