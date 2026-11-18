'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Ticket, ShieldCheck, Camera } from 'lucide-react';

export const P1Navbar = () => {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-50 px-4 max-w-5xl mx-auto w-full">
      <nav className="relative flex items-center justify-between px-5 py-3 rounded-2xl bg-[#121212]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
        {/* Top reflection highlight */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.18] to-transparent" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A1A] to-[#FF9A45] shadow-lg shadow-[#FF6A1A]/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            FIREFLY
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF6A1A]/15 text-[#FF9A45] border border-[#FF6A1A]/30">
              P1 PROTOTYPE
            </span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
              pathname === '/'
                ? 'bg-white/[0.10] text-white border border-white/[0.12]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Event Booking
          </Link>

          <Link
            href="/organiser"
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
              pathname === '/organiser'
                ? 'bg-[#FF6A1A]/20 text-[#FF9A45] border border-[#FF6A1A]/40'
                : 'text-white/70 hover:text-white bg-white/[0.04]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF9A45]" />
            <span>Organiser Console</span>
          </Link>
        </div>
      </nav>
    </header>
  );
};
