import type { Metadata } from 'next';
import './globals.css';
import { ReservaHeader } from '@/components/ReservaHeader';
import { AttendeeBottomNav } from '@/components/AttendeeBottomNav';

export const metadata: Metadata = {
  title: 'RESERVA — Event Ticketing & Management Platform',
  description: 'Discover and book tickets for concerts, music festivals, tech workshops, exhibitions, and sports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FBF9FA] text-[#1A1A1A] antialiased min-h-screen flex flex-col selection:bg-[#6B1736]/20 selection:text-[#6B1736]">
        <div className="ambient-glow" />
        <ReservaHeader />
        <main className="flex-1 relative z-10 max-w-5xl mx-auto w-full px-4 pt-4 pb-24 md:pb-16">
          {children}
        </main>
        <AttendeeBottomNav />
      </body>
    </html>
  );
}

