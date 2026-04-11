const CACHE_NAME = 'radio-playlist-pwa'
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './public/favicon.ico'
]

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cache => {
        if (cache !== CACHE_NAME) return caches.delete(cache)
      })
    ))
  )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.aac') ||
    url.hostname.includes('api') ||
    url.hostname.includes('meta') ||
    url.hostname.includes('itunes') ||
    event.request.headers.get('accept').includes('text/event-stream')
  ) return

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  )
})
