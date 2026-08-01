import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE || '/',

  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      devOptions: {
        enabled: true,
        type: 'module'
      },

      includeAssets: [
        'favicon.svg',
        'icons.svg'
      ],

      manifest: {
        name: 'CaisterPlayz Music',
        short_name: 'CaisterPlayz',
        description:
          'The social network for music artists. Share tracks, find new artists, and level up your library.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',

        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },

      workbox: {
        skipWaiting: true,
        clientsClaim: true,

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2,ttf}'
        ],

        navigateFallback: 'index.html',

        runtimeCaching: [
          {
            urlPattern: /^\/api\/(?!realtime).*/i,
            handler: 'NetworkFirst',

            options: {
              cacheName: 'pocketbase-api-cache',

              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },

              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true
      },

      '/_': {
        target: 'http://127.0.0.1:8090',
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
})
