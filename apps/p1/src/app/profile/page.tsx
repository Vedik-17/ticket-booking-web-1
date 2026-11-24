'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Ticket,
  Heart,
  PlusCircle,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Edit2,
} from 'lucide-react';
import { GlassButton } from '@firefly/ui';
import { AuthModal } from '@/components/AuthModal';

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('reserva_user_profile');
        if (raw) setUserProfile(JSON.parse(raw));

        const saved = localStorage.getItem('reserva_saved_events');
        if (saved) setSavedCount(JSON.parse(saved).length);
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reserva_user_profile');
      setUserProfile(null);
    }
  };

  const displayName = userProfile?.name || 'Vedik Reddy';
  const displayEmail = userProfile?.email || 'vedik.reddy@gmail.com';
  const initial = displayName.charAt(0).toUpperCase() || 'V';

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Profile & Account</h1>
        <p className="text-xs text-[#666666]">
          Manage your bookings, saved events, and organizer privileges
        </p>
      </div>

      {/* User Card (Screen 15 reference) */}
      <div className="bg-white rounded-3xl p-6 border border-[#F0E6E8] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#6B1736] text-white flex items-center justify-center text-xl font-bold shadow-md shadow-[#6B1736]/20">
            {initial}
          </div>
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-[#1A1A1A]">{displayName}</h2>
            <p className="text-xs text-[#666666]">{displayEmail}</p>
            {userProfile?.phone && (
              <p className="text-[11px] text-[#8E8E93]">+91 {userProfile.phone}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowAuthModal(true)}
          className="p-2.5 rounded-2xl bg-[#FFF5F7] text-[#6B1736] hover:bg-[#FDF2F4] transition-colors border border-[#FCE7EC]"
          title="Edit Profile"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Menu List */}
      <div className="bg-white rounded-3xl overflow-hidden border border-[#F0E6E8] shadow-sm divide-y divide-[#F0E6E8]">
        <Link
          href="/my-tickets"
          className="flex items-center justify-between p-4 hover:bg-[#FFF5F7] transition-colors"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <div className="p-2 rounded-xl bg-[#FDF2F4] text-[#6B1736]">
              <Ticket className="w-4 h-4" />
            </div>
            <span>My Bookings & Passes</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
        </Link>

        <Link
          href="/saved-events"
          className="flex items-center justify-between p-4 hover:bg-[#FFF5F7] transition-colors"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <div className="p-2 rounded-xl bg-[#FDF2F4] text-rose-500">
              <Heart className="w-4 h-4" />
            </div>
            <span>Saved Events ({savedCount})</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
        </Link>

        {/* Organize an Event (Redirect to Organizer Portal) */}
        <Link
          href="/organiser"
          className="flex items-center justify-between p-4 bg-[#FFF5F7]/70 hover:bg-[#FFF5F7] transition-colors border-l-4 border-l-[#6B1736]"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#6B1736]">
            <div className="p-2 rounded-xl bg-[#6B1736] text-white shadow-sm">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="block">Organize an Event</span>
              <span className="text-[10px] font-normal text-[#666666]">
                Host, sell tickets, and manage attendees
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#6B1736] text-white text-[10px] font-bold">
            Organizer Portal
          </span>
        </Link>

        <button
          onClick={() => alert('Account settings updated.')}
          className="w-full flex items-center justify-between p-4 hover:bg-[#FFF5F7] transition-colors text-left"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <div className="p-2 rounded-xl bg-[#FDF2F4] text-[#666666]">
              <Settings className="w-4 h-4" />
            </div>
            <span>Account Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
        </button>

        <a
          href="https://wa.me/919876543210?text=Hi%20Reserva%20Support,%20I%20have%20an%20enquiry"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between p-4 hover:bg-[#FFF5F7] transition-colors"
        >
          <div className="flex items-center gap-3 text-xs font-bold text-[#1A1A1A]">
            <div className="p-2 rounded-xl bg-[#FDF2F4] text-emerald-600">
              <HelpCircle className="w-4 h-4" />
            </div>
            <span>Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
        </a>
      </div>

      {/* Logout / Switch Account */}
      <div className="pt-2 text-center">
        {userProfile ? (
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:underline"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out from Reserva</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B1736] hover:underline"
          >
            <span>Log In or Sign Up</span>
          </button>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => setUserProfile(u)}
      />
    </div>
  );
}
