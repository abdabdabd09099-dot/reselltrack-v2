import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'icons/*.png', 'logo-full.png'],

      // ── Web App Manifest ───────────────────────────────────────────────────
      manifest: {
        name: 'ResellTrack',
        short_name: 'ResellTrack',
        description: 'Track your reselling business — sales, expenses, lending, reports.',
        theme_color: '#0D0F14',
        background_color: '#0D0F14',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/?source=pwa',
        id: 'com.reselltrack.app',
        categories: ['business', 'finance', 'productivity'],
        lang: 'en',
        dir: 'ltr',
        prefer_related_applications: false,

        icons: [
          { src: '/icons/icon-72.png',           sizes: '72x72',   type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-96.png',           sizes: '96x96',   type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-128.png',          sizes: '128x128', type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-144.png',          sizes: '144x144', type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-152.png',          sizes: '152x152', type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png',                 purpose: 'maskable' },
          { src: '/icons/icon-384.png',          sizes: '384x384', type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png',                 purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png',                 purpose: 'maskable' },
        ],

        screenshots: [
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'ResellTrack Dashboard',
          },
        ],

        shortcuts: [
          {
            name: 'Record Sale',
            short_name: 'New Sale',
            description: 'Quickly record a new sale',
            url: '/?page=sales&source=shortcut',
            icons: [{ src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Add Expense',
            short_name: 'Expense',
            description: 'Log a new expense',
            url: '/?page=expenses&source=shortcut',
            icons: [{ src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'View Reports',
            short_name: 'Reports',
            description: 'See your business reports',
            url: '/?page=reports&source=shortcut',
            icons: [{ src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],

        protocol_handlers: [
          { protocol: 'web+reselltrack', url: '/?action=%s' },
        ],
      },

      // ── Workbox service worker ─────────────────────────────────────────────
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        globIgnores: ['**/node_modules/**/*'],

        // Clean old caches on update
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,

        // Cache name
        cacheId: 'reselltrack-v3',

        // Navigation fallback for SPA
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          // ── Google Fonts — cache first ─────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Supabase API — network first, fall back to cache ───────────
          {
            urlPattern: /^https:\/\/devqrpcxaxjcxdixwitw\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── Supabase Auth — network only (never cache tokens) ──────────
          {
            urlPattern: /^https:\/\/devqrpcxaxjcxdixwitw\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkOnly',
          },
          // ── App icons and images — cache first ─────────────────────────
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],

  server: {
    port: 5173,
    open: true,
    headers: {
      'X-Content-Type-Options':  'nosniff',
      'X-Frame-Options':         'DENY',
      'X-XSS-Protection':        '1; mode=block',
      'Referrer-Policy':         'strict-origin-when-cross-origin',
      'Permissions-Policy':      'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com data:; " +
        "img-src 'self' data: blob: https:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
        "frame-ancestors 'none';",
    },
  },

  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split chunks for better caching
        manualChunks: {
          'react-vendor':    ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'charts-vendor':   ['recharts'],
        },
      },
    },
  },
})
