import React from 'react';
import Link from 'next/link';
import { MessageSquare, ShieldCheck, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="relative mt-20 border-t border-white/[0.06] bg-[#0c0c0c]/80 backdrop-blur-xl py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/50">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-wide">FIREFLY</span>
          <span>—</span>
          <span>Unified Event Ticketing Ecosystem</span>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <Link
            href="https://wa.me/919876543210?text=Hi%2C%20I%20have%20an%20enquiry%20regarding%20Firefly%20Ticketing."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/70 hover:text-[#FF9A45] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp Support</span>
          </Link>
          <span className="flex items-center gap-1 text-white/60">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>HMAC Cryptographic Tickets</span>
          </span>
          <span className="flex items-center gap-1 text-white/40">
            <span>Built with</span>
            <Heart className="w-3 h-3 text-[#FF6A1A] fill-current" />
          </span>
        </div>
      </div>
    </footer>
  );
};
