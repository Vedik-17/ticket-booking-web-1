'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { p1Storage } from '@/lib/idb-storage';

export default function TicketIndexRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = () => {
      const tickets = p1Storage.getTickets();
      if (tickets.length > 0) {
        router.replace(`/ticket/${tickets[0].id}`);
      } else {
        router.replace('/');
      }
    };

    handleRedirect();
    p1Storage.syncWithServer().then(handleRedirect);
  }, [router]);

  return (
    <div className="py-20 text-center space-y-4">
      <div className="w-10 h-10 border-2 border-[#FF6A1A] border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs text-white/50">Opening your ticket pass...</p>
    </div>
  );
}

