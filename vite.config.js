import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      /* Use injectManifest so we fully control the SW content.
         public/sw.js is a self-destroying SW that clears all Workbox caches
         from previous deployments and unregisters itself, so Firebase SDK
         can communicate freely without any SW interception. */
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo-kmark.png', 'icons.svg'],
      manifest: {
        name: 'K-MARK Portale Aziendale',
        short_name: 'K-MARK',
        description: 'Gestione presenze, spese e documenti aziendali K-MARK S.P.A',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'it',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/logo-kmark.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo-kmark.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo-kmark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
