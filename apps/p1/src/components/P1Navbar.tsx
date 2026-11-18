'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, ShieldCheck, Lock, ExternalLink } from 'lucide-react';

export const P1Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSecretUnlocking, setIsSecretUnlocking] = useState(false);
  const tapsRef = useRef<number[]>([]);

  // Secret Triple Tap on Logo triggers Admin Console navigation
  const handleLogoTap = (e: React.MouseEvent) => {
    const now = Date.now();
    // Keep taps that occurred within the last 900ms
    tapsRef.current = tapsRef.current.filter((t) => now - t < 900);
    tapsRef.current.push(now);

    if (tapsRef.current.length >= 3) {
      e.preventDefault();
      tapsRef.current = [];
      setIsSecretUnlocking(true);

      // Haptic feedback on mobile phones
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 80]);
        } catch {}
      }

      setTimeout(() => {
        setIsSecretUnlocking(false);
        router.push('/organiser');
      }, 350);
    }
  };

  return (
    <header className="sticky top-4 z-50 px-4 max-w-5xl mx-auto w-full">
      <nav className="relative flex items-center justify-between px-5 py-3 rounded-2xl bg-[#121212]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
        {/* Top reflection highlight */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.18] to-transparent" />

        {/* Secret Triple-Tap Logo */}
        <Link
          href="/"
          onClick={handleLogoTap}
          className={`flex items-center gap-2.5 select-none transition-all duration-300 ${
            isSecretUnlocking ? 'scale-105 shadow-[0_0_30px_rgba(255,106,26,0.6)] rounded-2xl p-0.5' : ''
          }`}
          title="Firefly (Triple tap for Organiser Admin)"
        >
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF6A1A] to-[#FF9A45] shadow-lg shadow-[#FF6A1A]/30 transition-transform ${
              isSecretUnlocking ? 'rotate-180 scale-110' : ''
            }`}
          >
            {isSecretUnlocking ? (
              <Lock className="w-4 h-4 text-white animate-pulse" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            FIREFLY
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                isSecretUnlocking
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-[#FF6A1A]/15 text-[#FF9A45] border border-[#FF6A1A]/30'
              }`}
            >
              {isSecretUnlocking ? 'UNLOCKING...' : 'P1 PROTOTYPE'}
            </span>
          </span>
        </Link>

        {/* Navigation Actions (Admin link completely hidden from public eyes) */}
        <div className="flex items-center gap-2">
          {pathname === '/organiser' ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-400 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Active</span>
              </span>
              <Link
                href="/"
                className="px-3 py-1.5 text-xs font-medium rounded-xl text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                Public Site
              </Link>
            </div>
          ) : (
            <Link
              href="/"
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all ${
                pathname === '/'
                  ? 'bg-white/[0.10] text-white border border-white/[0.12]'
                  : 'text-white/70 hover:text-white bg-white/[0.03]'
              }`}
            >
              Events
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};
