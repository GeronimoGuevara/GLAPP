import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      injectManifest: {
        injectionPoint: undefined
      },
      includeAssets: ['FotoIcono.jpeg'],
      manifest: {
        name: 'GLAPP',
        short_name: 'GLAPP',
        description: 'Nuestra app privada para seguimiento de ciclo, momentos íntimos y planificación de citas',
        theme_color: '#ff6b9d',
        background_color: '#fff0f5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'FotoIcono.jpeg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: 'FotoIcono.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: 'FotoIcono.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.neon\.tech\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'neon-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 300
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
