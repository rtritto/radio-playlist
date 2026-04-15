import type { UserConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import htmlMinifier from 'vite-plugin-html-minifier'

export default {
  base: '/radio-playlist/',
  root: 'src',
  cacheDir: '../.vite',
  server: {
    port: 3000,
    cors: false
  },
  build: {
    target: 'esnext',
    outDir: '../docs',
    minify: true,
    emptyOutDir: true
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the service worker
      devOptions: {
        // enabled: true,  // Enable PWA in development mode ~ Disable https://github.com/vikejs/vike/issues/388#issuecomment-1199280084
        type: 'module'
      },
      manifest: {
        name: 'Radio Playlist',
        short_name: 'RadioPlaylist',
        description: 'Playlist of Radio Stations',
        display: 'standalone',
        theme_color: '#1db954',
        background_color: '#121212',
        icons: [
          {
            src: '/radio-playlist/public/logo.svg',
            type: 'image/svg+xml',
            sizes: 'any'
          }
        ]
      }
    }),
    htmlMinifier()
  ]
} as UserConfig
