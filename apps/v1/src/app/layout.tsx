import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'FIREFLY — Event Ticketing Platform',
  description:
    'Discover live concerts, music festivals, exhibitions, nightlife, and conferences with instant guest checkout, cryptographic QR tickets, and seamless payments.',
  keywords: ['ticketing', 'events', 'concerts', 'festivals', 'guest checkout', 'qr passes'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080808] text-white antialiased min-h-screen flex flex-col selection:bg-[#FF6A1A]/30 selection:text-white">
        {/* Apple Liquid Glass Ambient Light Diffusion */}
        <div className="ambient-glow" />
        <div className="ambient-glow-bottom" />

        <Navbar />
        <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-4 pt-8 pb-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

