import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@firefly/shared-types',
    '@firefly/core',
    '@firefly/design-system',
    '@firefly/event-engine',
    '@firefly/inventory-engine',
    '@firefly/booking-engine',
    '@firefly/payment-engine',
    '@firefly/ticket-engine',
    '@firefly/scanner-engine',
    '@firefly/ui',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

