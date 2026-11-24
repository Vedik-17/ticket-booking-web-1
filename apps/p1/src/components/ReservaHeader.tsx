'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, PlusCircle, User, Compass, Calendar, ArrowRight } from 'lucide-react';
import { ReservaLogo } from './ReservaLogo';
import { AuthModal } from './AuthModal';

export const ReservaHeader: React.FC = () => {
  const pathname = usePathname();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // If on organizer portal, use the dedicated Organizer navigation
  if (pathname.startsWith('/organiser')) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#F8F3EA]/92 backdrop-blur-md border-b border-[#E8DFD3]/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="hover:opacity-90 transition-opacity">
              <ReservaLogo size="md" />
            </Link>

            {/* Editorial Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wide text-[#171D2B]/80">
              <Link
                href="/"
                className={`transition-colors hover:text-[#742F42] ${
                  pathname === '/' ? 'text-[#742F42] font-bold' : ''
                }`}
              >
                Events
              </Link>
              <Link
                href="/explore"
                className={`transition-colors hover:text-[#742F42] ${
                  pathname === '/explore' ? 'text-[#742F42] font-bold' : ''
                }`}
              >
                Travel
              </Link>
              <Link
                href="/explore"
                className="transition-colors hover:text-[#742F42]"
              >
                Venues
              </Link>
              <Link
                href="/organiser"
                className="transition-colors hover:text-[#742F42]"
              >
                Organize
              </Link>
            </nav>
          </div>

          {/* Right: Search, Sign In, Get Tickets Action Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/explore"
              className="p-2 rounded-full text-[#171D2B]/70 hover:text-[#742F42] hover:bg-[#F4EBDD] transition-colors"
              title="Search Experiences"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* Sign In text link */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs font-bold text-[#171D2B] hover:text-[#742F42] px-2.5 py-1.5 transition-colors hidden sm:inline-block"
            >
              Sign In
            </button>

            {/* Primary Action Button: "Get Tickets" in Burgundy Pill */}
            <Link
              href="/explore"
              className="px-4 sm:px-5 py-2.5 rounded-full bg-[#742F42] hover:bg-[#5C2434] text-white text-xs font-bold shadow-md shadow-[#742F42]/20 transition-all active:scale-[0.98] inline-flex items-center gap-1.5"
            >
              <span>Get Tickets</span>
            </Link>

            {/* User Profile avatar icon */}
            <Link
              href="/profile"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#E8DFD3] text-[#171D2B] hover:bg-[#D5B77B]/40 transition-colors"
              title="My Account"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};
