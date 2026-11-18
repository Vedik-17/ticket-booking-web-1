import type { Metadata } from 'next';
import './globals.css';
import { P1Navbar } from '@/components/P1Navbar';

export const metadata: Metadata = {
  title: 'FIREFLY P1 — Rapid Event Ticketing Prototype',
  description: 'Single-event ticketing with direct UPI payments, WhatsApp support, and local gate scanner.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080808] text-white antialiased min-h-screen flex flex-col selection:bg-[#FF6A1A]/30 selection:text-white">
        <div className="ambient-glow" />
        <P1Navbar />
        <main className="flex-1 relative z-10 max-w-5xl mx-auto w-full px-4 pt-6 pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}

