import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@firefly/shared-types',
    '@firefly/core',
    '@firefly/design-system',
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

