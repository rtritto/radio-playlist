import type { UserConfig } from 'vite'

export default {
  root: 'src',
  cacheDir: '../.vite',
  server: {
    port: 3000,
    cors: false
  },
  build: {
    target: 'esnext',
    outDir: '../docs',
    minify: true
  }
} as UserConfig
