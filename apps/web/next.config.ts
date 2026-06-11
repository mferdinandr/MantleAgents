import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@jakartagents/shared'],
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/dashboard', destination: '/overview', permanent: true },
      { source: '/timeline', destination: '/fx-agent?tab=timeline', permanent: true },
      { source: '/settings', destination: '/fx-agent?tab=settings', permanent: true },
    ];
  },
  serverExternalPackages: ['pino-pretty'],
};

export default nextConfig;
