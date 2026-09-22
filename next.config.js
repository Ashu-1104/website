/** @type {import('next').NextConfig} */

// ─── Content Security Policy ──────────────────────────────────────────────────
// 'unsafe-inline' in script-src is required by Next.js App Router for hydration.
// 'unsafe-eval' is included for safety — test removing it in production if needed.
//
// TODO: When adding Google Analytics, add these to the relevant directives:
//   script-src  → https://www.googletagmanager.com https://www.google-analytics.com
//   connect-src → https://www.google-analytics.com https://analytics.google.com
const CSP = [
  "default-src 'self'",

  // Scripts: self + inline (required by Next.js hydration)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",

  // Styles: self + inline (required by Tailwind CSS)
  "style-src 'self' 'unsafe-inline'",

  // Images: self + data URIs (base64) + blobs + any HTTPS CDN
  "img-src 'self' data: blob: https:",

  // Fonts: self only — next/font/google self-hosts at build time, no Google request at runtime
  "font-src 'self'",

  // Connections: self (API routes) + WebSocket for Socket.IO (any domain, user-configured)
  "connect-src 'self' wss: ws: https: https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",

  // Media (audio/video): self + blob URLs + any HTTPS CDN
  "media-src 'self' blob: https:",

  // Web workers: self + blob
  "worker-src 'self' blob:",

  // No iframes from external sources
  "frame-src 'none'",

  // No Flash/Java plugins
  "object-src 'none'",

  // Prevent base tag hijacking
  "base-uri 'self'",

  // Only allow form submissions to same origin
  "form-action 'self'",

  // Prevent this site from being embedded in external iframes (replaces X-Frame-Options)
  "frame-ancestors 'self'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'visualis-production.b-cdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.cdn2.seaart.me',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn2.stablediffusionapi.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'image.civitai.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-386f79ff42d64ab79283ebe4968ad8fa.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.modelslab.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.modelslab.ai',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  async redirects() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy — blocks XSS, injection attacks, and unauthorized resource loading
          { key: 'Content-Security-Policy', value: CSP },
          // Clickjacking protection (legacy fallback — frame-ancestors in CSP is the modern version)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // MIME-type sniffing protection
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer privacy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Restrict device access
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // Force HTTPS for 1 year (only active in production — safe to deploy)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Legacy XSS protection for older browsers
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Prevent browser from sending DNS prefetch to third-party domains
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
