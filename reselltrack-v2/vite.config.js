import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/*.png'],
      manifest: {
        name: 'ResellTrack',
        short_name: 'ResellTrack',
        description: 'Track your reselling business — sales, expenses, lending, reports.',
        theme_color: '#00C9A7',
        background_color: '#0F1117',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: '/icons/icon-72.png',           sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96.png',           sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128.png',          sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png',          sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png',          sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-384.png',          sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Record Sale',  short_name: 'New Sale', url: '/?page=sales',    icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
          { name: 'Add Expense',  short_name: 'Expense',  url: '/?page=expenses', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: /^https:\/\/devqrpcxaxjcxdixwitw\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],

  server: {
    port: 5173,
    open: true,
    // ── Security headers for local dev ─────────────────────────────────────
    headers: {
      'X-Content-Type-Options':    'nosniff',
      'X-Frame-Options':           'DENY',
      'X-XSS-Protection':          '1; mode=block',
      'Referrer-Policy':           'strict-origin-when-cross-origin',
      'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
      // CSP: only allow scripts/styles from self + Google Fonts + Supabase
      'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
        "frame-ancestors 'none';",
    },
  },

  build: {
    // Prevent source maps leaking code in production
    sourcemap: false,
    // Warn if chunks are large
    chunkSizeWarningLimit: 500,
  },
})
