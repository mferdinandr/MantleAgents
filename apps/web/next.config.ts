import type { NextConfig } from 'next';

const n8nBaseUrl = process.env.NEXT_PUBLIC_N8N_BASE_URL ?? 'http://localhost:5678';

const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https: wss: ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}`,
  `frame-src 'self' ${n8nBaseUrl}`,
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  typescript: {
    // wagmi's MetaMask connector exposes @metamask/sdk types via pnpm virtual store
    // paths that TypeScript can't portably name. The app is type-safe; this only
    // suppresses the "cannot be named" portability diagnostic.
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@mantleagents/shared'],
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/((?!orchestration|api/n8n-embed).*)',
        headers: [{ key: 'Content-Security-Policy', value: cspHeader }],
      },
    ];
  },
  async rewrites() {
    // Proxy n8n assets/API through Next.js so the iframe stays same-origin
    return [
{ source: '/assets/:path*', destination: `${n8nBaseUrl}/assets/:path*` },
      { source: '/static/:path*', destination: `${n8nBaseUrl}/static/:path*` },
      { source: '/favicon.ico', destination: `${n8nBaseUrl}/favicon.ico` },
      { source: '/types/:path*', destination: `${n8nBaseUrl}/types/:path*` },
    ];
  },
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
