'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Calendar, LayoutDashboard, ShieldCheck } from 'lucide-react';

export const Navbar = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Explore Events', icon: Calendar },
    { href: '/organiser', label: 'Organiser Portal', icon: LayoutDashboard },
    { href: '/admin', label: 'Platform Admin', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-4 z-50 px-4 max-w-7xl mx-auto w-full">
      <nav className="relative flex items-center justify-between px-6 py-3.5 rounded-2xl bg-[#121212]/75 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
        {/* Subtle glass reflection highlight */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.18] to-transparent" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A1A] to-[#FF9A45] shadow-lg shadow-[#FF6A1A]/30 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="absolute -inset-0.5 rounded-xl bg-[#FF6A1A] opacity-20 blur-sm group-hover:opacity-40 transition-opacity" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            FIREFLY
            <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/[0.06] text-[#FF9A45] border border-white/[0.08]">
              V1
            </span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1 md:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.10] text-white shadow-sm border border-white/[0.12]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF9A45]' : 'text-white/60'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

