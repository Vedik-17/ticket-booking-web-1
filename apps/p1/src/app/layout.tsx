import type { Metadata } from 'next';
import './globals.css';
import { ReservaHeader } from '@/components/ReservaHeader';
import { AttendeeBottomNav } from '@/components/AttendeeBottomNav';

export const metadata: Metadata = {
  title: 'RESERVA — Discover Events & Travel Experiences',
  description: 'Book tickets for concerts, festivals, workshops, and curated trips across India with direct UPI payments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F8F3EA] text-[#171D2B] antialiased min-h-screen flex flex-col selection:bg-[#B64A38]/20 selection:text-[#742F42]">
        <div className="ambient-glow" />
        <ReservaHeader />
        <main className="flex-1 relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-5 pb-24 md:pb-16">
          {children}
        </main>
        <AttendeeBottomNav />
      </body>
    </html>
  );
}

