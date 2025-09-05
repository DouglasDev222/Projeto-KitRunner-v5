const CACHE_NAME = 'kitrunner-admin-v1';
const urlsToCache = [
  '/admin',
  '/logo.webp',
  '/favicon.ico'
];

// Skip service worker registration in Replit preview
const isReplitPreview = () => {
  return location.hostname.includes('replit.dev') || 
         location.hostname.includes('replit.co') ||
         location.hostname.includes('spock.replit.dev');
};

self.addEventListener('install', (event) => {
  // Skip activation immediately for Replit preview
  if (isReplitPreview()) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch((error) => {
          console.warn('Admin Cache addAll failed:', error);
          return Promise.resolve();
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Skip caching entirely for Replit preview
  if (isReplitPreview()) {
    return;
  }

  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for API requests, websockets, and hot reload
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/@vite/') ||
      event.request.url.includes('/__vite_ping') ||
      event.request.url.includes('/ws') ||
      event.request.url.includes('hot-update')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).catch(() => {
          // Fallback for offline
          return new Response('Admin Offline', { status: 503 });
        });
      })
  );
});