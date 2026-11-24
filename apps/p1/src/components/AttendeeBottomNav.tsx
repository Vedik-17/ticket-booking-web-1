'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Ticket, User } from 'lucide-react';

export const AttendeeBottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide on organizer routes and checkout flows
  if (pathname.startsWith('/organiser') || pathname.startsWith('/pay/')) {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home, isActive: pathname === '/' },
    { label: 'Explore', href: '/explore', icon: Compass, isActive: pathname === '/explore' },
    {
      label: 'Tickets',
      href: '/my-tickets',
      icon: Ticket,
      isActive: pathname.startsWith('/my-tickets') || pathname.startsWith('/ticket'),
    },
    { label: 'Profile', href: '/profile', icon: User, isActive: pathname === '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F0E6E8] py-2 px-6 shadow-[0_-4px_20px_rgba(107,23,54,0.04)] md:hidden">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
                item.isActive ? 'text-[#6B1736]' : 'text-[#8E8E93] hover:text-[#4A4A4A]'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className={`text-[10px] font-semibold tracking-tight ${item.isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
