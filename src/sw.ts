/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope

// ── Precache (injecté par vite-plugin-pwa) ─────────────────────
precacheAndRoute(self.__WB_MANIFEST)

// ── Runtime caching ────────────────────────────────────────────
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
  })
)

registerRoute(
  /^https:\/\/tile\.openstreetmap\.org\/.*/i,
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 86400 * 7 })],
  })
)

self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

// ── Notifications push ─────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push reçu:', event.data?.text()?.slice(0, 100))

  let payload: { title?: string; body?: string; url?: string; tag?: string } = {}
  try {
    const text = event.data?.text() ?? ''
    if (text.startsWith('{')) {
      payload = JSON.parse(text)
    } else {
      payload = { title: 'VespaRecorder', body: text }
    }
  } catch {
    payload = { title: 'VespaRecorder', body: event.data?.text() ?? 'Nouvelle notification' }
  }

  const title = payload.title ?? 'VespaRecorder'
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag ?? 'vespa',
    data: { url: payload.url ?? '/' },
    requireInteraction: false,
  }

  console.log('[SW] Affichage notification:', title, options.body)
  event.waitUntil(self.registration.showNotification(title, options))
})

// Clic sur la notification → ouvre l'app sur la bonne URL
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si une fenêtre est déjà ouverte, on la met au premier plan et on navigue
      for (const c of clients) {
        if ('focus' in c) {
          c.focus()
          if ('navigate' in c) (c as WindowClient).navigate(url)
          return
        }
      }
      // Sinon on ouvre une nouvelle fenêtre
      return self.clients.openWindow(url)
    })
  )
})
