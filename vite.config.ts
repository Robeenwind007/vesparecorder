import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync, readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
          'leaflet-vendor':  ['leaflet'],
          'supabase-vendor': ['@supabase/supabase-js'],
          // jspdf, jspdf-autotable et xlsx sont importés en dynamic import
          // dans les pages d'export, donc ils seront automatiquement isolés
        },
      },
    },
  },
  plugins: [
    {
      name: 'cloudflare-spa',
      closeBundle() { copyFileSync('dist/index.html', 'dist/404.html') }
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Vespa Recorder',
        short_name: 'VespaRec',
        description: 'Enregistrement et suivi des nids de frelons asiatiques',
        theme_color: '#D97706',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/splash',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          },
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 86400 * 7 }
            }
          }
        ]
      }
    })
  ]
})
