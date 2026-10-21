import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/systems',
        destination: '/?tab=systems',
      },
      {
        source: '/incidents',
        destination: '/?tab=incidents',
      },
      {
        source: '/updates',
        destination: '/?tab=updates',
      },
      {
        source: '/reports',
        destination: '/?tab=reports',
      },
      {
        source: '/servers',
        destination: '/?tab=servers',
      },
      {
        source: '/security',
        destination: '/?tab=security',
      },
      {
        source: '/notifications',
        destination: '/?tab=notifications',
      },
      {
        source: '/discussion',
        destination: '/?tab=discussion',
      },
      {
        source: '/admin',
        destination: '/?tab=admin',
      },
    ];
  },
};

export default nextConfig;
